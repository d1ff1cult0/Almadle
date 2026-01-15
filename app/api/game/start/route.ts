import almaFoodData from '../../../../data/alma_food.json';
import { NextResponse } from 'next/server';
import { getSession, setSession, MAX_ATTEMPTS } from '../_lib';

export const runtime = 'nodejs';

type Dish = { id: number };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceNew = url.searchParams.get('new') === '1';

  const existing = await getSession();
  // Start a new game if there is no session, or the previous game already ended,
  // or if explicitly requested.
  if (!existing || existing.state !== 'playing' || forceNew) {
    const dishes = almaFoodData as Dish[];
    const randomDish = dishes[Math.floor(Math.random() * dishes.length)];
    await setSession({
      v: 1,
      targetId: randomDish.id,
      attempts: 0,
      state: 'playing',
      createdAt: Date.now(),
    });
  }

  return NextResponse.json({ maxAttempts: MAX_ATTEMPTS });
}


