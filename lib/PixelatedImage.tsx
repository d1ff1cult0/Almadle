"use client";
import Image from "next/image";
import { Caveat } from "next/font/google";

const caveat = Caveat({
  subsets: ["latin"],
  weight: "700",
});

// Pixelated Image Component using Server-Side API
export default function PixelatedImage({
  attempt,
  seed,
  random = false,
}: {
  attempt: number;
  seed: string;
  random?: boolean;
}) {
  // Use current timestamp to bust cache if needed, but next/image should handle caching.
  // We pass 'stage' to the API.
  const stage = attempt; // 0 to MAX_ATTEMPTS
  // Construct API URL
  let imageUrl: string;
  if (random) {
    imageUrl = `/api/image?random=${seed}&stage=${stage}`;
  } else {
    imageUrl = `/api/image?date=${seed}&stage=${stage}`;
  }

  return (
    <div className="relative transform rotate-[-2deg] mb-12 transition-transform hover:rotate-0 duration-300">
      <div className="bg-white p-3 pb-12 shadow-xl border border-gray-200">
        <div className="border border-gray-100 bg-gray-50 overflow-hidden w-[300px] h-[225px] relative">
          <Image
            src={imageUrl}
            alt="Pixelated Dish"
            width={300}
            height={225}
            className="w-full h-full object-cover"
            unoptimized // Allow dynamic API image
            key={stage} // Force re-render on stage change
          />
        </div>
        <div className={`absolute bottom-4 left-0 right-0 text-center ${caveat.className} text-3xl text-alma-text`}>
          Vandaag&apos;s Gerecht
        </div>
      </div>
    </div>
  );
}
