import almaFoodData from '../../../../data/alma_food.json';
import { NextResponse } from 'next/server';
import { getSession, setSession, MAX_ATTEMPTS } from '../_lib';

export const runtime = 'nodejs';

type Dish = {
  id: number;
  name: string;
  category: string;
  diet: string;
  carb_source: string;
  price_student: number;
  env_score: string;
  allergens?: string[];
};

type GuessResult = {
  dish: Omit<Dish, 'env_score'>;
  matches: {
    category: boolean;
    diet: boolean;
    carb_source: boolean;
    price: 'correct' | 'close' | 'wrong';
    allergenCount: 'correct' | 'close' | 'wrong';
    nameLength: 'correct' | 'close' | 'wrong';
  };
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new NextResponse('No active game', { status: 409 });
  }

  const body = (await req.json().catch(() => null)) as { guessId?: unknown } | null;
  const guessId = Number(body?.guessId);
  if (!Number.isFinite(guessId)) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const dishes = almaFoodData as Dish[];
  const target = dishes.find((d) => d.id === session.targetId);
  const guess = dishes.find((d) => d.id === guessId);
  if (!target || !guess) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // If game already ended, just return current state + target name (so UI can render)
  if (session.state !== 'playing') {
    return NextResponse.json({
      state: session.state,
      attempts: session.attempts,
      target: { id: target.id, name: target.name },
    });
  }

  const attempts = session.attempts + 1;
  const won = guess.id === target.id;
  const lost = !won && attempts >= MAX_ATTEMPTS;
  const state = won ? 'won' : lost ? 'lost' : 'playing';

  const priceDiff = Math.abs(guess.price_student - target.price_student);
  const targetAllergens = target.allergens?.length || 0;
  const guessAllergens = guess.allergens?.length || 0;
  const allergenDiff = Math.abs(guessAllergens - targetAllergens);
  const lengthDiff = Math.abs(guess.name.length - target.name.length);

  const result: GuessResult = {
    dish: {
      id: guess.id,
      name: guess.name,
      category: guess.category,
      diet: guess.diet,
      carb_source: guess.carb_source,
      price_student: guess.price_student,
      allergens: guess.allergens,
    },
    matches: {
      category: guess.category === target.category,
      diet: guess.diet === target.diet,
      carb_source: guess.carb_source === target.carb_source,
      price: priceDiff === 0 ? 'correct' : priceDiff <= 1.0 ? 'close' : 'wrong',
      allergenCount: allergenDiff === 0 ? 'correct' : allergenDiff <= 2 ? 'close' : 'wrong',
      nameLength: lengthDiff === 0 ? 'correct' : lengthDiff <= 3 ? 'close' : 'wrong',
    },
  };

  await setSession({
    ...session,
    attempts,
    state,
  });

  return NextResponse.json({
    guess: result,
    state,
    attempts,
    target: state === 'playing' ? null : { id: target.id, name: target.name },
  });
}


