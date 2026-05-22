import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import {
  fetchEspnGameSnapshot,
  fetchEspnHeaderSnapshots,
  fetchEspnScoreboardSnapshots,
} from "./espn";
import { findMatchupForSnapshot } from "./game-status";
import { createInitialPoolData } from "./pool";
import type { GameSnapshot, PoolData } from "./types";

const dataFile = poolDataFile();
const defaultPoolId = "default";
const blobPath = "pool-state/default.json";

export async function getPoolData(): Promise<PoolData> {
  const supabase = supabaseConfig();
  if (supabase) {
    const data = await getSupabasePoolData(supabase);
    return data ?? createInitialPoolData();
  }

  if (blobConfigured()) {
    const data = await getBlobPoolData();
    return data ?? createInitialPoolData();
  }

  try {
    const raw = await readFile(dataFile, "utf8");
    return JSON.parse(raw) as PoolData;
  } catch {
    return createInitialPoolData();
  }
}

export async function savePoolData(data: PoolData): Promise<void> {
  const stamped = { ...data, updatedAt: new Date().toISOString() };
  const supabase = supabaseConfig();
  if (supabase) {
    await saveSupabasePoolData(supabase, stamped);
    return;
  }

  if (blobConfigured()) {
    await saveBlobPoolData(stamped);
    return;
  }

  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(stamped, null, 2));
}

export async function updatePoolData(
  updater: (data: PoolData) => PoolData | Promise<PoolData>,
): Promise<PoolData> {
  const data = await getPoolData();
  const updated = await updater(structuredClone(data));
  await savePoolData(updated);
  return updated;
}

export async function getPoolDataWithLiveSnapshots(): Promise<PoolData> {
  const data = await getPoolData();
  try {
    const snapshots = await fetchLiveSnapshots(data);
    return { ...data, snapshots };
  } catch {
    return data;
  }
}

export async function syncLiveSnapshots(): Promise<GameSnapshot[]> {
  const data = await getPoolData();
  const snapshots = await fetchLiveSnapshots(data);
  await savePoolData({ ...data, snapshots });
  return snapshots;
}

async function fetchLiveSnapshots(data: PoolData): Promise<GameSnapshot[]> {
  const [headerResult, scoreboardResult] = await Promise.allSettled([
    fetchEspnHeaderSnapshots(),
    fetchEspnScoreboardSnapshots(),
  ]);
  const headerSnapshots =
    headerResult.status === "fulfilled" ? headerResult.value : [];
  const scoreboardSnapshots =
    scoreboardResult.status === "fulfilled" ? scoreboardResult.value : [];
  const discoveredGameIds = new Set(
    [...headerSnapshots, ...scoreboardSnapshots].map((snapshot) => snapshot.espnGameId),
  );
  const gameIds = data.matchups
    .map((matchup) => matchup.espnGameId)
    .filter(
      (gameId): gameId is string =>
        typeof gameId === "string" && !discoveredGameIds.has(gameId),
    );
  const focusedSnapshots = await Promise.allSettled(gameIds.map(fetchEspnGameSnapshot));
  const snapshots = [
    ...headerSnapshots,
    ...focusedSnapshots
      .filter((result): result is PromiseFulfilledResult<GameSnapshot> => result.status === "fulfilled")
      .map((result) => result.value),
    ...scoreboardSnapshots,
  ];
  const byGameId = new Map<string, GameSnapshot>();

  snapshots.forEach((snapshot) => {
    const matchup = findMatchupForSnapshot(data, snapshot);
    byGameId.set(snapshot.espnGameId, {
      ...snapshot,
      matchupId: matchup?.id ?? snapshot.matchupId,
    });
  });

  return Array.from(byGameId.values());
}

type SupabaseConfig = {
  id: string;
  key: string;
  table: string;
  url: string;
};

function supabaseConfig(): SupabaseConfig | undefined {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;

  return {
    id: process.env.SUPABASE_POOL_ID ?? defaultPoolId,
    key,
    table: process.env.SUPABASE_POOL_TABLE ?? "pool_state",
    url,
  };
}

async function getSupabasePoolData(config: SupabaseConfig): Promise<PoolData | undefined> {
  const response = await fetch(
    `${config.url}/rest/v1/${encodeURIComponent(config.table)}?id=eq.${encodeURIComponent(
      config.id,
    )}&select=data&limit=1`,
    {
      headers: supabaseHeaders(config),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase read failed: ${response.status}`);
  }

  const rows = (await response.json()) as { data?: PoolData }[];
  return rows[0]?.data;
}

async function saveSupabasePoolData(config: SupabaseConfig, data: PoolData): Promise<void> {
  const response = await fetch(
    `${config.url}/rest/v1/${encodeURIComponent(config.table)}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(config),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: config.id,
        data,
        updated_at: data.updatedAt,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase write failed: ${response.status}`);
  }
}

function supabaseHeaders(config: SupabaseConfig): HeadersInit {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
  };
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function getBlobPoolData(): Promise<PoolData | undefined> {
  try {
    const result = await get(blobPath, { access: "private" });
    if (!result || result.statusCode !== 200) return undefined;
    const raw = await new Response(result.stream).text();
    return JSON.parse(raw) as PoolData;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return undefined;
    throw error;
  }
}

async function saveBlobPoolData(data: PoolData): Promise<void> {
  await put(blobPath, JSON.stringify(data, null, 2), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

function poolDataFile(): string {
  if (process.env.POOL_DATA_MODE === "e2e") {
    return path.join(process.cwd(), ".e2e-data", "pool.json");
  }
  return path.join(process.cwd(), "data", "pool.json");
}
