import almaFoodData from '../../../../data/alma_food.json';
import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { getSession } from '../_lib';

export const runtime = 'nodejs';

type Dish = {
  id: number;
  image_url: string;
};

function contentTypeForFile(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function resolveImagePath(imageUrl: string) {
  const basename = path.basename(imageUrl);
  const dataPath = path.join(process.cwd(), 'data', 'images', basename);
  const publicPath = path.join(process.cwd(), 'public', 'images', basename);
  try {
    await fs.access(dataPath);
    return dataPath;
  } catch {
    return publicPath;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse('No active game', { status: 409 });

  const dishes = almaFoodData as Dish[];
  const dish = dishes.find((d) => d.id === session.targetId);
  if (!dish?.image_url) return new NextResponse('Not Found', { status: 404 });

  const filePath = await resolveImagePath(dish.image_url);
  let buf: Buffer;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }

  // After unlock (won/lost), return the original bytes.
  if (session.state !== 'playing') {
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': contentTypeForFile(filePath),
        'Cache-Control': 'no-store',
        Vary: 'Cookie',
        'X-Almadle-Mode': 'original',
        'X-Almadle-State': session.state,
        'X-Almadle-Attempts': String(session.attempts),
      },
    });
  }

  // While playing, return ONLY a pixelated server-generated image.
  const attempt = Math.max(0, Math.min(6, session.attempts));
  const outW = 350;
  const outH = 250;
  // Stronger pixelation: start very coarse and reveal with each attempt.
  // Match the original difficulty curve (previous pixelFactor formula):
  // attempt 0 => ~8x6, then gradually reveals.
  const smallWSteps = [8, 10, 13, 18, 29, 70];
  const stepIdx = Math.min(smallWSteps.length - 1, attempt);
  const smallW = smallWSteps[stepIdx]!;
  const smallH = Math.max(1, Math.round((smallW * outH) / outW));
  const pixelFactor = Math.max(1, Math.floor(outW / smallW));

  const pixelated = await sharp(buf)
    .resize(outW, outH, { fit: 'cover' })
    .resize(smallW, smallH, { kernel: sharp.kernel.nearest })
    .resize(outW, outH, { kernel: sharp.kernel.nearest })
    .webp({ quality: 90 })
    .toBuffer();

  return new NextResponse(new Uint8Array(pixelated), {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
      'X-Almadle-Mode': 'pixelated',
      'X-Almadle-State': session.state,
      'X-Almadle-Attempts': String(session.attempts),
      'X-Almadle-PixelFactor': String(pixelFactor),
      'X-Almadle-Small': `${smallW}x${smallH}`,
    },
  });
}


