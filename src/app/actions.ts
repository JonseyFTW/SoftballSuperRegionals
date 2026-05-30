"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminPassword, clearAdminSession, requireAdmin, setAdminSession } from "@/lib/auth";
import { getDefaultPayoutRules } from "@/lib/pool";
import { syncLiveSnapshots, updatePoolData } from "@/lib/store";
import type { Entrant, Matchup, PayoutRule, Round } from "@/lib/types";

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== adminPassword()) {
    redirect("/admin/login?error=1");
  }
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/");
}

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const payoutPlaces = numberFromForm(formData, "payoutPlaces", 3);
  const payoutRules: PayoutRule[] = Array.from({ length: payoutPlaces }, (_, index) => ({
    place: index + 1,
    percent: numberFromForm(
      formData,
      `payoutPercent-${index + 1}`,
      getDefaultPayoutRules(payoutPlaces)[index]?.percent ?? 0,
    ),
  }));

  await updatePoolData((data) => ({
    ...data,
    settings: {
      ...data.settings,
      name: stringFromForm(formData, "name", data.settings.name),
      entryFee: numberFromForm(formData, "entryFee", data.settings.entryFee),
      adminVenmo: stringFromForm(formData, "adminVenmo", ""),
      adminZelle: stringFromForm(formData, "adminZelle", ""),
      championshipRunsActual:
        stringFromForm(formData, "championshipRunsActual", "") === ""
          ? undefined
          : numberFromForm(formData, "championshipRunsActual", 0),
      payoutRules,
    },
  }));
  refreshAdmin();
}

export async function saveRound(formData: FormData) {
  await requireAdmin();
  const roundId = String(formData.get("roundId"));
  await updatePoolData((data) => ({
    ...data,
    rounds: data.rounds.map((round) =>
      round.id === roundId
        ? ({
            ...round,
            lockAt: optionalString(formData, "lockAt"),
            isLocked: formData.get("isLocked") === "on",
          } satisfies Round)
        : round,
    ),
  }));
  refreshAdmin();
}

export async function saveMatchup(formData: FormData) {
  await requireAdmin();
  const matchupId = String(formData.get("matchupId"));
  await updatePoolData((data) => ({
    ...data,
    matchups: data.matchups.map((matchup) =>
      matchup.id === matchupId
        ? ({
            ...matchup,
            label: stringFromForm(formData, "label", matchup.label),
            teamAId: optionalString(formData, "teamAId"),
            teamBId: optionalString(formData, "teamBId"),
            winnerTeamId: optionalString(formData, "winnerTeamId"),
            espnGameId: optionalString(formData, "espnGameId"),
          } satisfies Matchup)
        : matchup,
    ),
  }));
  refreshAdmin();
}

export async function saveEntrant(formData: FormData) {
  await requireAdmin();
  await upsertEntrantFromForm(formData);
  refreshAdmin();
}

export async function submitPublicEntry(formData: FormData) {
  const id = await upsertEntrantFromForm(formData, { publicEntry: true });
  revalidateAll();
  redirect(`/entrants/${id}`);
}

async function upsertEntrantFromForm(
  formData: FormData,
  options: { publicEntry?: boolean } = {},
): Promise<string> {
  const id = optionalString(formData, "entrantId") ?? `entry-${crypto.randomUUID()}`;
  await updatePoolData((data) => {
    const existing = data.entrants.find((entrant) => entrant.id === id);
    const picks = Object.fromEntries(
      data.matchups
        .map((matchup) => [matchup.id, optionalString(formData, `pick-${matchup.id}`)] as const)
        .filter(([, value]) => value),
    ) as Record<string, string>;
    const entrant: Entrant = {
      id,
      name: stringFromForm(formData, "name", existing?.name ?? "New entrant"),
      paid: options.publicEntry ? false : formData.get("paid") === "on",
      venmo: stringFromForm(formData, "venmo", ""),
      zelle: stringFromForm(formData, "zelle", ""),
      notes: stringFromForm(formData, "notes", ""),
      tiebreakerRuns: numberFromForm(formData, "tiebreakerRuns", existing?.tiebreakerRuns ?? 0),
      picks,
    };

    return {
      ...data,
      entrants: existing
        ? data.entrants.map((candidate) => (candidate.id === id ? entrant : candidate))
        : [...data.entrants, entrant],
    };
  });
  return id;
}

export async function deleteEntrant(formData: FormData) {
  await requireAdmin();
  const entrantId = String(formData.get("entrantId"));
  await updatePoolData((data) => ({
    ...data,
    entrants: data.entrants.filter((entrant) => entrant.id !== entrantId),
  }));
  refreshAdmin();
}

export async function syncEspn() {
  await requireAdmin();
  await syncLiveSnapshots();
  refreshAdmin();
}

function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/entrants");
  revalidatePath("/admin");
}

function refreshAdmin() {
  revalidateAll();
}

function stringFromForm(formData: FormData, key: string, fallback: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = stringFromForm(formData, key, "");
  return value === "" ? undefined : value;
}

function numberFromForm(formData: FormData, key: string, fallback: number): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}
