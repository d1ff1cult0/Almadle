
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getServerSession();

    if (!session) {
        redirect("/admin/login");
    }

    // Fetch data
    const totalGames = await prisma.gameResult.count();
    const totalWins = await prisma.gameResult.count({ where: { result: "won" } });
    const totalLosses = await prisma.gameResult.count({ where: { result: "lost" } });
    const totalAbandoned = await prisma.gameResult.count({ where: { result: "abandoned" } }); // 'started' without 'won'/'lost' logic needs better handling or just count 'started' as abandoned? 
    // Actually, 'abandoned' is not explicitly tracked yet in my update to Almadle.tsx (I tracked 'started').
    // Game starts with 'started' row? No, I create a NEW row for result.
    // Wait, my /api/track implementation creates a NEW row for every call.
    // So 'started' events are separate rows from 'won'/'lost' events.
    // To count abandoned: Total 'started' - (Total 'won' + Total 'lost').
    // Let's refine this logic.

    const totalStarted = await prisma.gameResult.count({ where: { result: "started" } });

    // Counts by mode
    const dailyCount = await prisma.gameResult.count({ where: { mode: "daily", result: { not: "started" } } });
    const infiniteCount = await prisma.gameResult.count({ where: { mode: "infinite", result: { not: "started" } } });

    const completedGames = totalWins + totalLosses;
    const abandonedGames = Math.max(0, totalStarted - completedGames);

    // Group by day for activity (Filter for Daily mode usually relevant for 'Daily' activity, but let's show all for now or just daily?)
    // User asked "amount of people playing each day".
    const gamesPerDayRaw = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch') as date, count(*) as count
      FROM GameResult
      WHERE (result = 'won' OR result = 'lost')
      GROUP BY date
      ORDER BY date ASC
      LIMIT 30
    `;

    // Simple serialization for BigInt
    const dailyStats = gamesPerDayRaw.map(g => ({
        date: g.date,
        count: Number(g.count)
    }));

    // Guess Distribution
    const guessDistribution = await prisma.gameResult.groupBy({
        by: ["guesses"],
        _count: {
            guesses: true,
        },
        where: {
            result: "won",
        },
        orderBy: {
            guesses: "asc",
        },
    });

    const data = {
        summary: {
            totalGames: completedGames,
            wins: totalWins,
            losses: totalLosses,
            abandoned: abandonedGames,
            winRate: completedGames > 0 ? totalWins / completedGames : 0,
            dailyCount,
            infiniteCount,
        },
        dailyStats,
        guessDistribution,
    };

    return <DashboardClient data={data} />;
}
