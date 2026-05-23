import type { GameSnapshot } from "./types";

type AnyRecord = Record<string, unknown>;

export function normalizeEspnHeaderEvent(event: unknown): GameSnapshot {
  const record = asRecord(event);
  const nestedCompetition = first(asArray(record.competitions));
  const competition =
    Object.keys(nestedCompetition).length > 0
      ? nestedCompetition
      : {
          competitors: record.competitors,
          series: [{ summary: stringValue(record.seriesSummary) }],
          startDate: record.date,
          status: record.fullStatus,
        };

  return normalizeCompetition({
    espnGameId: String(record.id ?? ""),
    summary: stringValue(record.summary),
    competition,
    situation: asRecord(record.situation),
  });
}

export function normalizeEspnGamePackage(payload: unknown): GameSnapshot {
  const record = asRecord(payload);
  const gamepackageJSON = asRecord(record.gamepackageJSON);
  const header = asRecord(gamepackageJSON.header);
  const competition = first(asArray(header.competitions));
  const situation = asRecord(gamepackageJSON.situation);

  return normalizeCompetition({
    espnGameId: String(record.gameId ?? ""),
    competition,
    situation,
  });
}

export function normalizeEspnScoreboardEvent(event: unknown): GameSnapshot {
  const record = asRecord(event);
  const competition = first(asArray(record.competitions));

  return normalizeCompetition({
    espnGameId: String(record.id ?? ""),
    summary: stringValue(record.summary),
    competition,
    situation: asRecord(competition.situation),
  });
}

async function fetchJson(url: string) {
  const response = await fetch(url, { next: { revalidate: 15 } });
  if (!response.ok) throw new Error(`ESPN request failed: ${response.status}`);
  return response.json();
}

export async function fetchEspnGameSnapshot(gameId: string): Promise<GameSnapshot> {
  const payload = await fetchJson(
    `https://cdn.espn.com/core/college-softball/game?xhr=1&gameId=${gameId}`,
  );
  return normalizeEspnGamePackage(payload);
}

export async function fetchEspnHeaderSnapshots(): Promise<GameSnapshot[]> {
  const payload = await fetchJson(
    "https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=baseball&league=college-softball",
  );
  const sports = asArray(asRecord(payload).sports);
  return sports.flatMap((sport) =>
    asArray(asRecord(sport).leagues).flatMap((league) =>
      asArray(asRecord(league).events).map(normalizeEspnHeaderEvent),
    ),
  );
}

function normalizeCompetition({
  espnGameId,
  summary,
  competition,
  situation,
}: {
  espnGameId: string;
  summary?: string;
  competition: AnyRecord;
  situation: AnyRecord;
}): GameSnapshot {
  const competitors = asArray(competition.competitors).map(asRecord);
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const status = asRecord(competition.status);
  const statusType = asRecord(status.type);
  const series = firstValue(competition.series);

  const statusText =
    stringValue(statusType.detail) ||
    stringValue(statusType.shortDetail) ||
    summary ||
    "Scheduled";

  return {
    espnGameId,
    awayTeamName: teamName(away),
    homeTeamName: teamName(home),
    awayAbbreviation: teamAbbreviation(away),
    homeAbbreviation: teamAbbreviation(home),
    awayScore: numberValue(away?.score),
    homeScore: numberValue(home?.score),
    status: statusText,
    statusState: stringValue(statusType.state),
    inning: numberValue(status.period),
    inningHalf: stringValue(status.periodPrefix) || inningHalfFromStatus(statusText),
    balls: numberValue(situation.balls),
    strikes: numberValue(situation.strikes),
    outs: numberValue(situation.outs),
    onFirst: runnerOn(situation.onFirst),
    onSecond: runnerOn(situation.onSecond),
    onThird: runnerOn(situation.onThird),
    batter: personName(situation.batter),
    pitcher: personName(situation.pitcher),
    lastPlay: stringValue(asRecord(situation.lastPlay).text),
    seriesSummary: stringValue(asRecord(series).summary),
    startDate: stringValue(competition.startDate),
    source: "espn",
    updatedAt: new Date().toISOString(),
  };
}

function inningHalfFromStatus(status: string): string {
  if (/\btop\b/i.test(status)) return "Top";
  if (/\b(bot|bottom)\b/i.test(status)) return "Bot";
  return "";
}

function teamName(competitor?: AnyRecord): string {
  return (
    stringValue(asRecord(competitor?.team).displayName) ||
    stringValue(competitor?.displayName) ||
    stringValue(competitor?.name)
  );
}

export async function fetchEspnScoreboardSnapshots(): Promise<GameSnapshot[]> {
  const payload = await fetchJson(
    "https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/scoreboard",
  );
  return asArray(asRecord(payload).events).map(normalizeEspnScoreboardEvent);
}

function teamAbbreviation(competitor?: AnyRecord): string {
  return stringValue(asRecord(competitor?.team).abbreviation) || stringValue(competitor?.abbreviation);
}

function personName(value: unknown): string {
  const person = asRecord(value);
  return stringValue(asRecord(person.athlete).displayName);
}

function runnerOn(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return value !== "" && value !== "0";
  return value !== null && value !== undefined && Object.keys(asRecord(value)).length > 0;
}

function asRecord(value: unknown): AnyRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function first(values: unknown[]): AnyRecord {
  return asRecord(values[0]);
}

function firstValue(value: unknown): AnyRecord {
  if (Array.isArray(value)) return first(value);
  return asRecord(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}
