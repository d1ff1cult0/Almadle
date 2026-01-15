import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Prevent direct access to original images stored in /public/images.
// The game serves images only via API routes.
export function middleware(_req: NextRequest) {
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  matcher: ['/images/:path*'],
};


