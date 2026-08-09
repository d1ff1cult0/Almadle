"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { signOut } from "next-auth/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleGauge,
  Flag,
  LogOut,
  Minus,
  Play,
  Target,
  Trophy,
} from "lucide-react";
import type { ActivityDay, AdminDashboardData, GuessStat, TargetStat } from "@/lib/adminStats";

type RangeKey = "7d" | "30d" | "90d" | "1y" | "all";
type Granularity = "day" | "week" | "month";
type ModeFilter = "all" | "daily" | "infinite";
type TargetSort = "played" | "hardest" | "easiest";

type Bounds = {
  start: string;
  end: string;
  previousStart: string | null;
  previousEnd: string | null;
};

type Metrics = {
  starts: number;
  wins: number;
  losses: number;
  completed: number;
  winRate: number;
};

const DAILY_COLOR = "#E05D44";
const INFINITE_COLOR = "#002147";
const WIN_COLOR = "#28A745";
const LOSS_COLOR = "#ef4444";
const RANGE_DAYS: Record<Exclude<RangeKey, "all">, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const parseDate = (date: string) => new Date(`${date}T00:00:00Z`);
const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const daysBetween = (start: string, end: string) =>
  Math.max(1, Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000) + 1);
const formatDate = (date: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(parseDate(date));
const formatInteger = (value: number) => Math.round(value).toLocaleString("en-GB");
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function getBounds(data: AdminDashboardData, range: RangeKey): Bounds {
  const end = data.generatedAt.slice(0, 10);
  const earliest = data.activity[0]?.date ?? end;

  if (range === "all") {
    return { start: earliest, end, previousStart: null, previousEnd: null };
  }

  const days = RANGE_DAYS[range];
  const startDate = addDays(parseDate(end), -(days - 1));
  const previousEndDate = addDays(startDate, -1);

  return {
    start: toDateKey(startDate),
    end,
    previousStart: toDateKey(addDays(previousEndDate, -(days - 1))),
    previousEnd: toDateKey(previousEndDate),
  };
}

const isWithin = (date: string, start: string, end: string) => date >= start && date <= end;

function rowMetrics(row: ActivityDay, mode: ModeFilter): Metrics {
  const includeDaily = mode === "all" || mode === "daily";
  const includeInfinite = mode === "all" || mode === "infinite";
  const starts = (includeDaily ? row.dailyStarts : 0) + (includeInfinite ? row.infiniteStarts : 0);
  const wins = (includeDaily ? row.dailyWins : 0) + (includeInfinite ? row.infiniteWins : 0);
  const losses = (includeDaily ? row.dailyLosses : 0) + (includeInfinite ? row.infiniteLosses : 0);
  const completed = wins + losses;

  return { starts, wins, losses, completed, winRate: completed ? (wins / completed) * 100 : 0 };
}

function totalMetrics(rows: ActivityDay[], mode: ModeFilter): Metrics {
  const totals = rows.reduce(
    (sum, row) => {
      const metrics = rowMetrics(row, mode);
      sum.starts += metrics.starts;
      sum.wins += metrics.wins;
      sum.losses += metrics.losses;
      return sum;
    },
    { starts: 0, wins: 0, losses: 0 },
  );
  const completed = totals.wins + totals.losses;

  return { ...totals, completed, winRate: completed ? (totals.wins / completed) * 100 : 0 };
}

function startOfPeriod(date: Date, granularity: Granularity) {
  const result = new Date(date);
  if (granularity === "week") {
    const daysSinceMonday = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - daysSinceMonday);
  }
  if (granularity === "month") result.setUTCDate(1);
  return result;
}

function nextPeriod(date: Date, granularity: Granularity) {
  const next = new Date(date);
  if (granularity === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (granularity === "week") next.setUTCDate(next.getUTCDate() + 7);
  if (granularity === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function periodLabel(date: string, granularity: Granularity) {
  if (granularity === "month") return formatDate(date, { month: "short", year: "2-digit" });
  return formatDate(date, { day: "numeric", month: "short" });
}

function periodDescription(date: string, granularity: Granularity) {
  if (granularity === "day")
    return formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (granularity === "week") {
    return `Week of ${formatDate(date, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return formatDate(date, { month: "long", year: "numeric" });
}

function aggregateActivity(
  rows: ActivityDay[],
  bounds: Pick<Bounds, "start" | "end">,
  granularity: Granularity,
  mode: ModeFilter,
) {
  const firstPeriod = startOfPeriod(parseDate(bounds.start), granularity);
  const lastPeriod = startOfPeriod(parseDate(bounds.end), granularity);
  const periods = new Map<
    string,
    {
      date: string;
      period: string;
      daily: number;
      infinite: number;
      wins: number;
      losses: number;
      winRate: number | null;
    }
  >();

  for (let cursor = firstPeriod; cursor <= lastPeriod; cursor = nextPeriod(cursor, granularity)) {
    const date = toDateKey(cursor);
    periods.set(date, {
      date: periodLabel(date, granularity),
      period: periodDescription(date, granularity),
      daily: 0,
      infinite: 0,
      wins: 0,
      losses: 0,
      winRate: null,
    });
  }

  rows
    .filter((row) => isWithin(row.date, bounds.start, bounds.end))
    .forEach((row) => {
      const key = toDateKey(startOfPeriod(parseDate(row.date), granularity));
      const period = periods.get(key);
      if (!period) return;

      if (mode !== "infinite") period.daily += row.dailyWins + row.dailyLosses;
      if (mode !== "daily") period.infinite += row.infiniteWins + row.infiniteLosses;
      const metrics = rowMetrics(row, mode);
      period.wins += metrics.wins;
      period.losses += metrics.losses;
    });

  return Array.from(periods.values()).map((period) => ({
    ...period,
    winRate: period.wins + period.losses ? (period.wins / (period.wins + period.losses)) * 100 : null,
  }));
}

function averageWinningGuesses(stats: GuessStat[]) {
  const totals = stats.reduce(
    (sum, stat) => {
      sum.wins += stat.count;
      sum.guesses += stat.guesses * stat.count;
      return sum;
    },
    { wins: 0, guesses: 0 },
  );
  return totals.wins ? totals.guesses / totals.wins : 0;
}

function periodChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function Trend({
  value,
  unit = "%",
  lowerIsBetter = false,
}: {
  value: number | null;
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  if (value === null) return <span className="text-xs font-semibold text-blue-700">New in this period</span>;
  const rounded = unit === "pp" ? value.toFixed(1) : Math.abs(value).toFixed(1);
  const isPositive = value > 0;
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  const color = value === 0 ? "text-gray-500" : isGood ? "text-green-700" : "text-red-600";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      {value === 0 ? (
        <Minus className="h-3.5 w-3.5" />
      ) : isPositive ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {unit === "pp" ? `${value > 0 ? "+" : ""}${rounded} pp` : `${rounded}${unit}`}
      <span className="font-normal text-gray-400">vs previous</span>
    </span>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  trend,
  trendUnit,
  lowerIsBetter,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  trend?: number | null;
  trendUnit?: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-alma-text">{value}</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-2.5 text-alma-orange">{icon}</div>
      </div>
      <p className="mt-2 text-xs text-gray-500">{detail}</p>
      {trend !== undefined && (
        <div className="mt-3">
          <Trend value={trend} unit={trendUnit} lowerIsBetter={lowerIsBetter} />
        </div>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-gray-500">{message}</div>;
}

export default function DashboardClient({ data }: { data: AdminDashboardData }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [targetSort, setTargetSort] = useState<TargetSort>("played");

  const bounds = useMemo(() => getBounds(data, range), [data, range]);
  const currentRows = useMemo(
    () => data.activity.filter((row) => isWithin(row.date, bounds.start, bounds.end)),
    [data.activity, bounds],
  );
  const previousRows = useMemo(
    () =>
      bounds.previousStart && bounds.previousEnd
        ? data.activity.filter((row) => isWithin(row.date, bounds.previousStart!, bounds.previousEnd!))
        : [],
    [data.activity, bounds],
  );
  const currentMetrics = useMemo(() => totalMetrics(currentRows, mode), [currentRows, mode]);
  const previousMetrics = useMemo(() => totalMetrics(previousRows, mode), [previousRows, mode]);
  const chartData = useMemo(
    () => aggregateActivity(data.activity, bounds, granularity, mode),
    [data.activity, bounds, granularity, mode],
  );

  const currentGuessStats = useMemo(
    () =>
      data.guessStats.filter(
        (stat) => isWithin(stat.date, bounds.start, bounds.end) && (mode === "all" || stat.mode === mode),
      ),
    [data.guessStats, bounds, mode],
  );
  const previousGuessStats = useMemo(
    () =>
      bounds.previousStart && bounds.previousEnd
        ? data.guessStats.filter(
            (stat) =>
              isWithin(stat.date, bounds.previousStart!, bounds.previousEnd!) && (mode === "all" || stat.mode === mode),
          )
        : [],
    [data.guessStats, bounds, mode],
  );
  const averageGuesses = averageWinningGuesses(currentGuessStats);
  const previousAverageGuesses = averageWinningGuesses(previousGuessStats);
  const calendarDays = daysBetween(bounds.start, bounds.end);
  const gamesPerDay = currentMetrics.completed / calendarDays;
  const previousCalendarDays =
    bounds.previousStart && bounds.previousEnd ? daysBetween(bounds.previousStart, bounds.previousEnd) : 0;
  const previousGamesPerDay = previousCalendarDays ? previousMetrics.completed / previousCalendarDays : 0;
  const showComparison = range !== "all";

  const guessDistribution = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const guesses = index + 1;
        return {
          guesses: `${guesses}`,
          wins: currentGuessStats.filter((stat) => stat.guesses === guesses).reduce((sum, stat) => sum + stat.count, 0),
        };
      }),
    [currentGuessStats],
  );

  const modeComparison = useMemo(() => {
    return (["daily", "infinite"] as const).map((itemMode) => {
      const metrics = totalMetrics(currentRows, itemMode);
      const guesses = data.guessStats.filter(
        (stat) => isWithin(stat.date, bounds.start, bounds.end) && stat.mode === itemMode,
      );
      return {
        mode: itemMode,
        ...metrics,
        share: currentRows.length
          ? (metrics.completed / Math.max(1, totalMetrics(currentRows, "all").completed)) * 100
          : 0,
        averageGuesses: averageWinningGuesses(guesses),
      };
    });
  }, [currentRows, data.guessStats, bounds]);

  const weekdayData = useMemo(() => {
    const weekdays = WEEKDAYS.map((day) => ({
      day,
      games: 0,
      wins: 0,
      losses: 0,
      winRate: null as number | null,
    }));
    currentRows.forEach((row) => {
      const weekdayIndex = (parseDate(row.date).getUTCDay() + 6) % 7;
      const metrics = rowMetrics(row, mode);
      weekdays[weekdayIndex].games += metrics.completed;
      weekdays[weekdayIndex].wins += metrics.wins;
      weekdays[weekdayIndex].losses += metrics.losses;
    });
    return weekdays.map((weekday) => ({
      ...weekday,
      winRate: weekday.games ? (weekday.wins / weekday.games) * 100 : null,
    }));
  }, [currentRows, mode]);

  const targetRows = useMemo(() => {
    const relevantTargets = data.targetStats.filter(
      (stat) => isWithin(stat.date, bounds.start, bounds.end) && (mode === "all" || stat.mode === mode),
    );
    const targets = new Map<
      number,
      Omit<TargetStat, "date" | "mode"> & { completed: number; winRate: number; averageGuesses: number }
    >();

    relevantTargets.forEach((stat) => {
      const current = targets.get(stat.targetId) ?? {
        targetId: stat.targetId,
        targetName: stat.targetName,
        starts: 0,
        wins: 0,
        losses: 0,
        winningGuessTotal: 0,
        completed: 0,
        winRate: 0,
        averageGuesses: 0,
      };
      current.starts += stat.starts;
      current.wins += stat.wins;
      current.losses += stat.losses;
      current.winningGuessTotal += stat.winningGuessTotal;
      current.completed = current.wins + current.losses;
      current.winRate = current.completed ? (current.wins / current.completed) * 100 : 0;
      current.averageGuesses = current.wins ? current.winningGuessTotal / current.wins : 0;
      targets.set(stat.targetId, current);
    });

    const rows = Array.from(targets.values());
    const qualified = rows.filter((row) => row.completed >= 3);
    const sortable = targetSort === "played" || qualified.length < 3 ? rows : qualified;

    return sortable
      .sort((a, b) => {
        if (targetSort === "hardest") return a.winRate - b.winRate || b.completed - a.completed;
        if (targetSort === "easiest") return b.winRate - a.winRate || b.completed - a.completed;
        return b.completed - a.completed || b.starts - a.starts;
      })
      .slice(0, 8);
  }, [data.targetStats, bounds, mode, targetSort]);

  const peakPeriod = chartData.reduce<(typeof chartData)[number] | null>((peak, period) => {
    const total = period.daily + period.infinite;
    return !peak || total > peak.daily + peak.infinite ? period : peak;
  }, null);
  const bestWeekday = weekdayData.reduce<(typeof weekdayData)[number] | null>(
    (best, weekday) => (!best || weekday.games > best.games ? weekday : best),
    null,
  );
  const outcomeData = [
    { name: "Won", value: currentMetrics.wins, color: WIN_COLOR },
    { name: "Lost", value: currentMetrics.losses, color: LOSS_COLOR },
  ];
  const modeData = modeComparison.map((item) => ({
    name: item.mode === "daily" ? "Daily" : "Infinite",
    value: item.completed,
    color: item.mode === "daily" ? DAILY_COLOR : INFINITE_COLOR,
  }));
  const rangeLabel = `${formatDate(bounds.start, { day: "numeric", month: "short", year: "numeric" })} – ${formatDate(
    bounds.end,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  )}`;
  const modeLabel = mode === "all" ? "All modes" : mode === "daily" ? "Daily mode" : "Infinite mode";
  const hasGames = currentMetrics.completed > 0;

  const selectRange = (nextRange: RangeKey) => {
    setRange(nextRange);
    if (nextRange === "7d" || nextRange === "30d") setGranularity("day");
    if (nextRange === "90d") setGranularity("week");
    if (nextRange === "1y" || nextRange === "all") setGranularity("month");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-alma-orange">Game analytics</p>
            <h1 className="text-3xl font-bold tracking-tight text-alma-text">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              {rangeLabel} · {modeLabel}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 shadow-sm transition-colors hover:border-red-200 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Time period</p>
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => selectRange(option.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      range === option.value ? "bg-alma-text text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Group by</span>
              <select
                value={granularity}
                onChange={(event) => setGranularity(event.target.value as Granularity)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-alma-orange lg:w-36"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Game mode</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ModeFilter)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-alma-orange lg:w-40"
              >
                <option value="all">All modes</option>
                <option value="daily">Daily</option>
                <option value="infinite">Infinite</option>
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            title="Completed games"
            value={formatInteger(currentMetrics.completed)}
            detail={`${formatInteger(currentMetrics.wins)} won · ${formatInteger(currentMetrics.losses)} lost`}
            icon={<Flag className="h-5 w-5" />}
            trend={showComparison ? periodChange(currentMetrics.completed, previousMetrics.completed) : undefined}
          />
          <MetricCard
            title="Recorded starts"
            value={formatInteger(currentMetrics.starts)}
            detail="Game-start events recorded"
            icon={<Play className="h-5 w-5" />}
            trend={showComparison ? periodChange(currentMetrics.starts, previousMetrics.starts) : undefined}
          />
          <MetricCard
            title="Wins"
            value={formatInteger(currentMetrics.wins)}
            detail={`${formatPercent(currentMetrics.completed ? (currentMetrics.wins / currentMetrics.completed) * 100 : 0)} of completed games`}
            icon={<Trophy className="h-5 w-5" />}
            trend={showComparison ? periodChange(currentMetrics.wins, previousMetrics.wins) : undefined}
          />
          <MetricCard
            title="Win rate"
            value={formatPercent(currentMetrics.winRate)}
            detail="Wins / completed games"
            icon={<Target className="h-5 w-5" />}
            trend={showComparison ? currentMetrics.winRate - previousMetrics.winRate : undefined}
            trendUnit="pp"
          />
          <MetricCard
            title="Avg. winning guesses"
            value={averageGuesses ? averageGuesses.toFixed(2) : "—"}
            detail="Lower means faster wins"
            icon={<CircleGauge className="h-5 w-5" />}
            trend={
              showComparison && averageGuesses && previousAverageGuesses
                ? averageGuesses - previousAverageGuesses
                : undefined
            }
            trendUnit=""
            lowerIsBetter
          />
          <MetricCard
            title="Games / day"
            value={gamesPerDay.toFixed(1)}
            detail={`Average across ${formatInteger(calendarDays)} calendar days`}
            icon={<CalendarDays className="h-5 w-5" />}
            trend={showComparison ? periodChange(gamesPerDay, previousGamesPerDay) : undefined}
          />
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-lg font-bold text-alma-text">Games over time</h2>
              <p className="text-sm text-gray-500">
                Completed games by mode, with the win-rate trend on the right axis.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-400">Peak {granularity}</p>
                <p className="font-semibold text-gray-700">
                  {peakPeriod && peakPeriod.daily + peakPeriod.infinite
                    ? `${peakPeriod.period} · ${formatInteger(peakPeriod.daily + peakPeriod.infinite)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Busiest weekday</p>
                <p className="font-semibold text-gray-700">
                  {bestWeekday?.games ? `${bestWeekday.day} · ${formatInteger(bestWeekday.games)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Active days</p>
                <p className="font-semibold text-gray-700">
                  {formatInteger(currentRows.filter((row) => rowMetrics(row, mode).completed > 0).length)}
                </p>
              </div>
            </div>
          </div>
          <div className="h-96">
            {hasGames ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={28} />
                  <YAxis yAxisId="games" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={(_label, payload) => payload?.[0]?.payload?.period ?? ""}
                    formatter={(value, name) => [
                      name === "Win rate" ? formatPercent(Number(value)) : formatInteger(Number(value)),
                      name,
                    ]}
                  />
                  <Legend />
                  {mode !== "infinite" && (
                    <Area
                      yAxisId="games"
                      type="monotone"
                      dataKey="daily"
                      name="Daily games"
                      stackId="games"
                      stroke={DAILY_COLOR}
                      fill={DAILY_COLOR}
                      fillOpacity={0.28}
                    />
                  )}
                  {mode !== "daily" && (
                    <Area
                      yAxisId="games"
                      type="monotone"
                      dataKey="infinite"
                      name="Infinite games"
                      stackId="games"
                      stroke={INFINITE_COLOR}
                      fill={INFINITE_COLOR}
                      fillOpacity={0.2}
                    />
                  )}
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="winRate"
                    name="Win rate"
                    stroke={WIN_COLOR}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No completed games were recorded in this period." />
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
            <h2 className="text-lg font-bold text-alma-text">Mode performance</h2>
            <p className="mb-5 text-sm text-gray-500">A like-for-like comparison for the selected time period.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-semibold">Mode</th>
                    <th className="pb-3 text-right font-semibold">Starts</th>
                    <th className="pb-3 text-right font-semibold">Completed</th>
                    <th className="pb-3 text-right font-semibold">Share</th>
                    <th className="pb-3 text-right font-semibold">Win rate</th>
                    <th className="pb-3 text-right font-semibold">Avg. guesses</th>
                  </tr>
                </thead>
                <tbody>
                  {modeComparison.map((item) => (
                    <tr key={item.mode} className="border-b border-gray-50 last:border-0">
                      <td className="py-4 font-semibold text-gray-800">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.mode === "daily" ? DAILY_COLOR : INFINITE_COLOR }}
                        />
                        {item.mode === "daily" ? "Daily" : "Infinite"}
                      </td>
                      <td className="py-4 text-right text-gray-600">{formatInteger(item.starts)}</td>
                      <td className="py-4 text-right text-gray-600">{formatInteger(item.completed)}</td>
                      <td className="py-4 text-right text-gray-600">{formatPercent(item.share)}</td>
                      <td className="py-4 text-right font-semibold text-gray-800">{formatPercent(item.winRate)}</td>
                      <td className="py-4 text-right text-gray-600">
                        {item.averageGuesses ? item.averageGuesses.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-alma-text">Outcomes</h2>
            <p className="text-sm text-gray-500">Completed {modeLabel.toLowerCase()}.</p>
            <div className="h-64">
              {hasGames ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={86}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {outcomeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatInteger(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No outcomes in this period." />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-alma-text">Winning guess distribution</h2>
            <p className="mb-4 text-sm text-gray-500">How quickly winning games were solved.</p>
            <div className="h-72">
              {currentMetrics.wins ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={guessDistribution} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="guesses" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [formatInteger(Number(value)), "Wins"]} />
                    <Bar dataKey="wins" name="Wins" fill={INFINITE_COLOR} radius={[5, 5, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No wins were recorded in this period." />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-alma-text">Weekday pattern</h2>
            <p className="mb-4 text-sm text-gray-500">Completed games and win rate by weekday.</p>
            <div className="h-72">
              {hasGames ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weekdayData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="games" allowDecimals={false} />
                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "Win rate" ? formatPercent(Number(value)) : formatInteger(Number(value)),
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar yAxisId="games" dataKey="games" name="Games" fill={DAILY_COLOR} radius={[5, 5, 0, 0]} />
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="winRate"
                      name="Win rate"
                      stroke={WIN_COLOR}
                      strokeWidth={2.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No weekday pattern is available for this period." />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-alma-text">Game mode mix</h2>
            <p className="text-sm text-gray-500">Share of completed games in the selected period.</p>
            <div className="h-64">
              {modeData.some((item) => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={86}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {modeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatInteger(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No mode data in this period." />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-lg font-bold text-alma-text">Target performance</h2>
                <p className="text-sm text-gray-500">
                  Dish-level results; rate rankings require at least three completed games.
                </p>
              </div>
              <label>
                <span className="sr-only">Sort target performance</span>
                <select
                  value={targetSort}
                  onChange={(event) => setTargetSort(event.target.value as TargetSort)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-alma-orange"
                >
                  <option value="played">Most played</option>
                  <option value="hardest">Hardest</option>
                  <option value="easiest">Highest win rate</option>
                </select>
              </label>
            </div>
            {targetRows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 font-semibold">Target dish</th>
                      <th className="pb-3 text-right font-semibold">Starts</th>
                      <th className="pb-3 text-right font-semibold">Completed</th>
                      <th className="pb-3 text-right font-semibold">Win rate</th>
                      <th className="pb-3 text-right font-semibold">Avg. guesses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetRows.map((target) => (
                      <tr key={target.targetId} className="border-b border-gray-50 last:border-0">
                        <td className="max-w-64 py-3 pr-4 font-medium text-gray-800">
                          <span className="block truncate" title={target.targetName}>
                            {target.targetName}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-600">{formatInteger(target.starts)}</td>
                        <td className="py-3 text-right text-gray-600">{formatInteger(target.completed)}</td>
                        <td className="py-3 text-right font-semibold text-gray-800">{formatPercent(target.winRate)}</td>
                        <td className="py-3 text-right text-gray-600">
                          {target.averageGuesses ? target.averageGuesses.toFixed(2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-gray-500">
                No target data is available for this selection.
              </div>
            )}
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-xs text-blue-800 sm:flex-row">
          <p>
            Data coverage:{" "}
            {data.activity.length
              ? `${formatDate(data.activity[0].date, { day: "numeric", month: "short", year: "numeric" })} – ${formatDate(data.activity[data.activity.length - 1].date, { day: "numeric", month: "short", year: "numeric" })}`
              : "No recorded activity"}
            .
          </p>
          <p>Starts and completed outcomes are separate events; no player-identifying data is collected.</p>
        </footer>
      </div>
    </div>
  );
}
