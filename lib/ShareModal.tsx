"use client";
import { Share2, X } from "lucide-react";
import type { Dish, GuessResult } from "./Almadle";

// Share Modal Component
export default function ShareModal({
  isOpen,
  onClose,
  guesses,
  targetDish,
  gameState,
  max_attempts,
  random = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  guesses: GuessResult[];
  targetDish: Dish;
  gameState: "won" | "lost" | "playing";
  max_attempts: number;
  random?: boolean;
}) {
  if (!isOpen) return null;

  const handleShare = () => {
    // Generate emoji grid
    let shareText = `Almadle ${random ? "Random" : ""} ${new Date().toLocaleDateString()}\n`;
    shareText += `Voltooid in ${guesses.length}/${max_attempts}\n\n`;

    guesses.forEach((g) => {
      // logic for emojis:
      // Green square for correct, Yellow for close, Black/White for wrong?
      // Let's use squares.
      const getEmoji = (status: "correct" | "close" | "wrong" | boolean) => {
        if (status === "correct" || status === true) return "🟩";
        if (status === "close") return "🟨";
        return "⬜";
      };
      shareText += `${getEmoji(g.matches.diet)}${getEmoji(g.matches.carb_source)}${getEmoji(g.matches.price)}${getEmoji(
        g.matches.allergenCount
      )}${getEmoji(g.matches.nameLength)}\n`;
    });

    navigator.clipboard.writeText(shareText);
    alert("Resultaten gekopieerd naar klembord!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Game Complete</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center text-center">
          <h3 className="text-alma-green font-bold text-lg mb-6">
            {gameState === "won"
              ? `Gefeliciteerd! Je hebt het geraden in ${guesses.length} pogingen!`
              : "Volgende keer beter!"}
          </h3>

          <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 flex justify-between items-center border border-gray-100">
            <div className="text-center w-1/2 border-r border-gray-200">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Jouw Gok</div>
              <div className="text-alma-orange font-bold text-xl">{guesses[guesses.length - 1].dish.name}</div>
            </div>
            <div className="text-center w-1/2">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Exacte Prijs</div>
              <div className="text-alma-orange font-bold text-xl">€{targetDish.price_student.toFixed(2)}</div>
            </div>
          </div>

          {/* Stats place holder */}
          <div className="w-full mb-8">
            <h4 className="text-gray-500 font-medium mb-3 text-sm uppercase">Je Statistieken</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-alma-orange">3</div>
                <div className="text-xs text-gray-500">Spellen Gespeeld</div>
              </div>
              <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-alma-orange">100%</div>
                <div className="text-xs text-gray-500">Nauwkeurigheid</div>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="w-full">
            <h4 className="text-gray-500 font-medium mb-3 text-sm uppercase">Resultaat Delen</h4>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={handleShare}
                className="bg-alma-green text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 transition-colors w-full justify-center shadow-md"
              >
                <Share2 className="w-5 h-5" />
                Deel Resultaat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
