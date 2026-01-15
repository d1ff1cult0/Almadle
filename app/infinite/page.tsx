import { Shrikhand } from "next/font/google";
import Almadle from "@/lib/Almadle";

export const dynamic = "force-dynamic";

const shrikhand = Shrikhand({
  weight: "400",
  subsets: ["latin"],
});

export default function Infinite() {
  const randomSeed = randomString(10);
  return (
    <main className="w-full min-h-screen flex flex-col items-center py-10 px-4 bg-alma-bg text-alma-text selection:bg-alma-accent/30">
      <h1
        className={`${shrikhand.className} text-[5.5rem] leading-tight mb-8 text-alma-text drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)]`}
      >
        Almadle
      </h1>

      <Almadle random={true} dishSeed={randomSeed} />
    </main>
  );
}

function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
