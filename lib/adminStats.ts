import almaFoodData from "@/data/alma_food.json";
import { prisma } from "@/lib/prisma";

type NumericValue = bigint | number;

type ActivityRow = {
  date: string | null;
  dailyStarts: NumericValue;
  dailyWins: NumericValue;
  dailyLosses: NumericValue;
  infiniteStarts: NumericValue;
  infiniteWins: NumericValue;
  infiniteLosses: NumericValue;
};

type GuessRow = {
  date: string | null;
  mode: string;
  guesses: number;
  count: NumericValue;
};

type TargetRow = {
  date: string | null;
  targetId: number;
  mode: string;
  starts: NumericValue;
  wins: NumericValue;
  losses: NumericValue;
  winningGuessTotal: NumericValue;
};

export type ActivityDay = {
  date: string;
  dailyStarts: number;
  dailyWins: number;
  dailyLosses: number;
  infiniteStarts: number;
  infiniteWins: number;
  infiniteLosses: number;
};

export type GuessStat = {
  date: string;
  mode: "daily" | "infinite";
  guesses: number;
  count: number;
};

export type TargetStat = {
  date: string;
  targetId: number;
  targetName: string;
  mode: "daily" | "infinite";
  starts: number;
  wins: number;
  losses: number;
  winningGuessTotal: number;
};

export type AdminDashboardData = {
  activity: ActivityDay[];
  guessStats: GuessStat[];
  targetStats: TargetStat[];
  generatedAt: string;
};

const toNumber = (value: NumericValue) => Number(value);
const isMode = (mode: string): mode is "daily" | "infinite" => mode === "daily" || mode === "infinite";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [activityRows, guessRows, targetRows] = await Promise.all([
    prisma.$queryRaw<ActivityRow[]>`
      SELECT
        date(createdAt) AS date,
        SUM(CASE WHEN mode = 'daily' AND result = 'started' THEN 1 ELSE 0 END) AS "dailyStarts",
        SUM(CASE WHEN mode = 'daily' AND result = 'won' THEN 1 ELSE 0 END) AS "dailyWins",
        SUM(CASE WHEN mode = 'daily' AND result = 'lost' THEN 1 ELSE 0 END) AS "dailyLosses",
        SUM(CASE WHEN mode = 'infinite' AND result = 'started' THEN 1 ELSE 0 END) AS "infiniteStarts",
        SUM(CASE WHEN mode = 'infinite' AND result = 'won' THEN 1 ELSE 0 END) AS "infiniteWins",
        SUM(CASE WHEN mode = 'infinite' AND result = 'lost' THEN 1 ELSE 0 END) AS "infiniteLosses"
      FROM GameResult
      WHERE date(createdAt) IS NOT NULL
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `,
    prisma.$queryRaw<GuessRow[]>`
      SELECT
        date(createdAt) AS date,
        mode,
        guesses,
        COUNT(*) AS count
      FROM GameResult
      WHERE result = 'won'
        AND guesses BETWEEN 1 AND 6
        AND date(createdAt) IS NOT NULL
      GROUP BY date(createdAt), mode, guesses
      ORDER BY date ASC, mode ASC, guesses ASC
    `,
    prisma.$queryRaw<TargetRow[]>`
      SELECT
        date(createdAt) AS date,
        targetId,
        mode,
        SUM(CASE WHEN result = 'started' THEN 1 ELSE 0 END) AS starts,
        SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN result = 'lost' THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN result = 'won' THEN guesses ELSE 0 END) AS "winningGuessTotal"
      FROM GameResult
      WHERE targetId IS NOT NULL
        AND date(createdAt) IS NOT NULL
      GROUP BY date(createdAt), targetId, mode
      ORDER BY date ASC
    `,
  ]);

  const targetNames = new Map(almaFoodData.map((dish) => [dish.id, dish.name]));

  return {
    activity: activityRows
      .filter((row): row is ActivityRow & { date: string } => Boolean(row.date))
      .map((row) => ({
        date: row.date,
        dailyStarts: toNumber(row.dailyStarts),
        dailyWins: toNumber(row.dailyWins),
        dailyLosses: toNumber(row.dailyLosses),
        infiniteStarts: toNumber(row.infiniteStarts),
        infiniteWins: toNumber(row.infiniteWins),
        infiniteLosses: toNumber(row.infiniteLosses),
      })),
    guessStats: guessRows
      .filter((row): row is GuessRow & { date: string; mode: "daily" | "infinite" } =>
        Boolean(row.date && isMode(row.mode)),
      )
      .map((row) => ({
        date: row.date,
        mode: row.mode,
        guesses: row.guesses,
        count: toNumber(row.count),
      })),
    targetStats: targetRows
      .filter((row): row is TargetRow & { date: string; mode: "daily" | "infinite" } =>
        Boolean(row.date && isMode(row.mode)),
      )
      .map((row) => ({
        date: row.date,
        targetId: row.targetId,
        targetName: targetNames.get(row.targetId) ?? `Dish #${row.targetId}`,
        mode: row.mode,
        starts: toNumber(row.starts),
        wins: toNumber(row.wins),
        losses: toNumber(row.losses),
        winningGuessTotal: toNumber(row.winningGuessTotal),
      })),
    generatedAt: new Date().toISOString(),
  };
}
