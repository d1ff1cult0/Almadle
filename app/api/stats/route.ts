
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const session = await getServerSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const totalGames = await prisma.gameResult.count();
        const totalWins = await prisma.gameResult.count({ where: { result: "won" } });
        const totalLosses = await prisma.gameResult.count({ where: { result: "lost" } });
        const totalAbandoned = await prisma.gameResult.count({ where: { result: "abandoned" } });

        // Group by day (using SQLite strftime)
        // We want: date, count
        const gamesPerDay = await prisma.$queryRaw`
      SELECT strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch') as date, count(*) as count
      FROM GameResult
      GROUP BY date
      ORDER BY date ASC
      LIMIT 30
    `;

        // Win Rate per Day
        const winRatePerDay = await prisma.$queryRaw`
      SELECT strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch') as date, 
             CAST(SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as winRate
      FROM GameResult
      WHERE result != 'abandoned'
      GROUP BY date
      ORDER BY date ASC
    `;

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

        return NextResponse.json({
            summary: {
                totalGames,
                wins: totalWins,
                losses: totalLosses,
                abandoned: totalAbandoned,
                winRate: totalWins / (totalWins + totalLosses) || 0,
            },
            dailyStats: gamesPerDay, // Note: serialization of BigInt might need handling
            guessDistribution,
        });
    } catch (error) {
        console.error("Stats error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
