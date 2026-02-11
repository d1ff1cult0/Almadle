
"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
} from "recharts";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

type DashboardData = {
    summary: {
        totalGames: number;
        wins: number;
        losses: number;
        abandoned: number;
        winRate: number;
        dailyCount: number;
        infiniteCount: number;
    };
    dailyStats: { date: string; count: number }[];
    guessDistribution: { guesses: number; _count: { guesses: number } }[];
};

export default function DashboardClient({ data }: { data: DashboardData }) {
    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

    const distributionData = Array.from({ length: 6 }, (_, i) => {
        const guesses = i + 1;
        const found = data.guessDistribution.find((d) => d.guesses === guesses);
        return {
            guesses: guesses.toString(),
            count: found?._count.guesses || 0,
        };
    });

    const pieData = [
        { name: "Won", value: data.summary.wins, color: "#4ade80" }, // green-400
        { name: "Lost", value: data.summary.losses, color: "#f87171" }, // red-400
        { name: "Abandoned", value: data.summary.abandoned, color: "#9ca3af" }, // gray-400
    ];

    const modeData = [
        { name: "Daily", value: data.summary.dailyCount, color: "#F3A712" }, // alma-orange
        { name: "Infinite", value: data.summary.infiniteCount, color: "#29302B" }, // alma-text
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <button
                        onClick={() => signOut({ callbackUrl: "/admin/login" })}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Total Games</h3>
                        <p className="text-3xl font-bold text-alma-text">{data.summary.totalGames}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Daily Mode</h3>
                        <p className="text-3xl font-bold text-alma-orange">{data.summary.dailyCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Infinite Mode</h3>
                        <p className="text-3xl font-bold text-gray-700">{data.summary.infiniteCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Total Wins</h3>
                        <p className="text-3xl font-bold text-blue-600">{data.summary.wins}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Win Rate</h3>
                        <p className="text-3xl font-bold text-green-600">
                            {(data.summary.winRate * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Daily Activity */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                        <h3 className="text-gray-800 font-bold mb-4">Activity Over Time (Daily Mode)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#F3A712"
                                    strokeWidth={3}
                                    activeDot={{ r: 8 }}
                                    name="Games"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Mode Breakdown */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col items-center">
                        <h3 className="text-gray-800 font-bold mb-4 self-start">Game Modes</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={modeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {modeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-4 mt-2">
                            {modeData.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-1 text-sm">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Guess Distribution */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                        <h3 className="text-gray-800 font-bold mb-4">Guess Distribution (Wins Only)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="guesses" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#29302B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
