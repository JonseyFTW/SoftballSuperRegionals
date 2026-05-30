import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import {
  fetchEspnGameSnapshot,
  fetchEspnHeaderSnapshots,
  fetchEspnScoreboardSnapshots,
} from "./espn";
import { findMatchupForSnapshot } from "./game-status";
import { fetchNcaaBracketSnapshots } from "./ncaa";
import { createInitialPoolData } from "./pool";
import type { GameSnapshot, Matchup, PoolData, Round, Team } from "./types";

const dataFile = poolDataFile();
const defaultPoolId = "default";
const blobPath = "pool-state/default.json";

export async function getPoolData(): Promise<PoolData> {
  const supabase = supabaseConfig();
  if (supabase) {
    const data = await getSupabasePoolData(supabase);
    return normalizePoolData(data ?? createInitialPoolData());
  }

  if (blobConfigured()) {
    const data = await getBlobPoolData();
    return normalizePoolData(data ?? createInitialPoolData());
  }

  try {
    const raw = await readFile(dataFile, "utf8");
    return normalizePoolData(JSON.parse(raw) as PoolData);
  } catch {
    return normalizePoolData(createInitialPoolData());
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
  const [headerResult, scoreboardResult, ncaaResult] = await Promise.allSettled([
    fetchEspnHeaderSnapshots(),
    fetchEspnScoreboardSnapshots(),
    fetchNcaaBracketSnapshots(data),
  ]);
  const headerSnapshots =
    headerResult.status === "fulfilled" ? headerResult.value : [];
  const scoreboardSnapshots =
    scoreboardResult.status === "fulfilled" ? scoreboardResult.value : [];
  const ncaaSnapshots = ncaaResult.status === "fulfilled" ? ncaaResult.value : [];
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
    ...ncaaSnapshots,
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


function normalizePoolData(data: PoolData): PoolData {
  const wcws = createInitialPoolData();
  const hasWcwsBracket = data.matchups.some((matchup) => matchup.id === "game-1");
  const savedSuperRegionals = data.matchups.filter((matchup) => matchup.roundId === "super-regionals");
  const entrantHasLegacyPicks = data.entrants.some((entrant) =>
    Object.keys(entrant.picks).some((matchupId) => matchupId.startsWith("super-")),
  );
  const legacySuperRegionals =
    savedSuperRegionals.length > 0 || entrantHasLegacyPicks ? savedSuperRegionals : [];
  const superRegionalMatchups =
    legacySuperRegionals.length > 0
      ? fillSuperRegionalWinners(legacySuperRegionals)
      : entrantHasLegacyPicks
        ? defaultSuperRegionalMatchups()
        : [];

  if (
    hasWcwsBracket &&
    data.rounds.some((round) => round.id === "super-regionals") &&
    superRegionalMatchups.length === savedSuperRegionals.length
  ) {
    return data;
  }

  if (hasWcwsBracket && superRegionalMatchups.length === 0) return data;

  const legacyRounds = data.rounds.filter((round) => round.id === "super-regionals");
  const superRegionalRound: Round = legacyRounds[0] ?? {
    id: "super-regionals",
    name: "Super Regionals",
    points: 1,
    isLocked: true,
  };
  const wcwsTeamIds = new Set(wcws.teams.map((team) => team.id));
  const legacyTeams = mergeTeams([...defaultSuperRegionalTeams(), ...data.teams]).filter(
    (team) => !wcwsTeamIds.has(team.id),
  );
  const wcwsMatchups = hasWcwsBracket
    ? data.matchups.filter((matchup) => matchup.roundId !== "super-regionals")
    : wcws.matchups;
  const migratedMatchups = [...superRegionalMatchups, ...wcwsMatchups];
  const migratedRounds = hasWcwsBracket
    ? [superRegionalRound, ...data.rounds.filter((round) => round.id !== "super-regionals")]
    : [superRegionalRound, ...wcws.rounds];

  return {
    ...data,
    teams: mergeTeams([...wcws.teams, ...legacyTeams]),
    rounds: migratedRounds,
    matchups: migratedMatchups,
    entrants: data.entrants.map((entrant) => ({
      ...entrant,
      picks: Object.fromEntries(
        Object.entries(entrant.picks).filter(([matchupId]) =>
          migratedMatchups.some((matchup) => matchup.id === matchupId),
        ),
      ),
    })),
  };
}

function fillSuperRegionalWinners(matchups: Matchup[]): Matchup[] {
  const defaultWinners = new Map(
    defaultSuperRegionalMatchups().map((matchup) => [matchup.id, matchup.winnerTeamId]),
  );

  return matchups.map((matchup) => ({
    ...matchup,
    winnerTeamId: matchup.winnerTeamId ?? defaultWinners.get(matchup.id),
  }));
}

function defaultSuperRegionalTeams(): Team[] {
  return [
    team("alabama", "Alabama Crimson Tide", "Alabama", "ALA", "16", "#9e1b32"),
    team("lsu", "LSU Tigers", "LSU", "LSU", "9", "#461d7c"),
    team("arkansas", "Arkansas Razorbacks", "Arkansas", "ARK", "3", "#9d2235"),
    team("duke", "Duke Blue Devils", "Duke", "DUKE", "14", "#00539b"),
    team("texas", "Texas Longhorns", "Texas", "TEX", "6", "#bf5700"),
    team("arizona-state", "Arizona State Sun Devils", "Arizona State", "ASU", "11", "#8c1d40"),
    team("florida", "Florida Gators", "Florida", "FLA", "2", "#0021a5"),
    team("texas-tech", "Texas Tech Red Raiders", "Texas Tech", "TTU", "15", "#cc0000"),
    team("oklahoma", "Oklahoma Sooners", "Oklahoma", "OU", "1", "#841617"),
    team("mississippi-state", "Mississippi State Bulldogs", "Mississippi State", "MSST", "16", "#660000"),
    team("tennessee", "Tennessee Lady Volunteers", "Tennessee", "TENN", "7", "#ff8200"),
    team("georgia", "Georgia Bulldogs", "Georgia", "UGA", "10", "#ba0c2f"),
    team("nebraska", "Nebraska Cornhuskers", "Nebraska", "NEB", "4", "#e41c38"),
    team("oklahoma-state", "Oklahoma State Cowgirls", "Oklahoma State", "OKST", "13", "#ff7300"),
    team("ucla", "UCLA Bruins", "UCLA", "UCLA", "5", "#2774ae"),
    team("ucf", "UCF Knights", "UCF", "UCF", "12", "#ba9b37"),
  ];
}

function defaultSuperRegionalMatchups(): Matchup[] {
  return [
    legacyMatchup("super-alabama-lsu", "Alabama vs LSU", "alabama", "lsu", "alabama", 1),
    legacyMatchup("super-arkansas-duke", "Arkansas vs Duke", "arkansas", "duke", "arkansas", 2),
    legacyMatchup("super-texas-arizona-state", "Texas vs Arizona State", "texas", "arizona-state", "texas", 3),
    legacyMatchup("super-florida-texas-tech", "Florida vs Texas Tech", "florida", "texas-tech", "texas-tech", 4),
    legacyMatchup("super-oklahoma-mississippi-state", "Oklahoma vs Mississippi State", "oklahoma", "mississippi-state", "mississippi-state", 5),
    legacyMatchup("super-tennessee-georgia", "Tennessee vs Georgia", "tennessee", "georgia", "tennessee", 6),
    legacyMatchup("super-nebraska-oklahoma-state", "Nebraska vs Oklahoma State", "nebraska", "oklahoma-state", "nebraska", 7),
    legacyMatchup("super-ucla-ucf", "UCLA vs UCF", "ucla", "ucf", "ucla", 8),
  ];
}

function legacyMatchup(
  id: string,
  label: string,
  teamAId: string,
  teamBId: string,
  winnerTeamId: string,
  sortOrder: number,
): Matchup {
  return { id, label, teamAId, teamBId, winnerTeamId, sortOrder, roundId: "super-regionals" };
}

function team(
  id: string,
  name: string,
  shortName: string,
  abbreviation: string,
  seed?: string,
  color?: string,
): Team {
  return { id, name, shortName, abbreviation, seed, color };
}


function mergeTeams(teams: Team[]): Team[] {
  const byId = new Map<string, Team>();
  teams.forEach((team) => byId.set(team.id, team));
  return Array.from(byId.values());
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
    return normalizePoolData(JSON.parse(raw) as PoolData);
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
