import almaFoodData from '../../../data/alma_food.json';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Dish = {
  id: number;
  name: string;
  image_url: string;
  category: string;
  diet: string;
  carb_source: string;
  price_student: number;
  env_score: string;
  allergens?: string[];
};

export async function GET() {
  const dishes = (almaFoodData as Dish[]).map(({ image_url: _imageUrl, ...rest }) => rest);
  return NextResponse.json(dishes);
}


