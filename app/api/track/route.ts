
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode, result, guesses, targetId, seed } = body;

        if (!mode || !result || guesses === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const gameResult = await prisma.gameResult.create({
            data: {
                mode,
                result,
                guesses,
                targetId,
                seed,
            },
        });

        return NextResponse.json(gameResult, { status: 201 });
    } catch (error) {
        console.error("Error creating game result:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
