"use client";
/**
 * @author Witse Panneels
 */
import { useState, useMemo } from "react";
import { Search, Leaf, Wheat, Euro, TriangleAlert, ChefHat, ChevronDown, ChevronUp } from "lucide-react";
import { getRandomDish } from "@/app/utils/randomDish";
import { getDailyDish } from "@/app/utils/dailyDish";
import PixelatedImage from "./PixelatedImage";
import ShareModal from "./ShareModal";
import almaFoodData from "@/data/alma_food.json";

const MAX_ATTEMPTS = 6;

/**
 * if random is set to true, the dishSeed should be a string of random characters, this seed needs to be determined server-side as to not create rendering errors
 */
export default function Almadle({ dishSeed = "niet random", random = false }: { dishSeed?: string; random?: boolean }) {
  // const [targetDish, setTargetDish] = useState<Dish | null>(null);
  let targetDish: Dish;
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  if (random) {
    targetDish = getRandomDish(dishSeed);
  } else {
    dishSeed = new Date().toISOString().split("T")[0]; // Use today's date YYYY-MM-DD
    targetDish = getDailyDish();
  }

  const filteredDishes = useMemo(() => {
    if (!searchTerm) return [];
    return almaFoodData
      .filter(
        (dish) =>
          dish.name.toLowerCase().includes(searchTerm.toLowerCase()) && !guesses.some((g) => g.dish.id === dish.id)
      )
      .slice(0, 5); // Limit limit results
  }, [searchTerm, guesses]);

  const handleGuess = (dish: Dish) => {
    if (!targetDish || gameState !== "playing") return;

    const priceDiff = Math.abs(dish.price_student - targetDish.price_student);
    const targetAllergens = targetDish.allergens?.length || 0;
    const guessAllergens = dish.allergens?.length || 0;
    const allergenDiff = Math.abs(guessAllergens - targetAllergens);
    const lengthDiff = dish.name.length - targetDish.name.length; // + if guess is longer, - if shorter

    const match: GuessResult = {
      dish,
      matches: {
        category: dish.category === targetDish.category,
        diet: dish.diet === targetDish.diet,
        carb_source: dish.carb_source === targetDish.carb_source,
        price: priceDiff === 0 ? "correct" : priceDiff <= 1.0 ? "close" : "wrong",
        priceValue:
          priceDiff === 0
            ? "correct"
            : priceDiff <= 1.0
            ? dish.price_student > targetDish.price_student
              ? "lower"
              : "higher"
            : "wrong", // We could add directional arrow for price too? Request only mentioned Name.
        allergenCount: allergenDiff === 0 ? "correct" : allergenDiff <= 2 ? "close" : "wrong",
        nameLength: lengthDiff === 0 ? "correct" : Math.abs(lengthDiff) <= 3 ? "close" : "wrong",
        nameLengthDiff: lengthDiff,
      },
    };

    const newGuesses = [...guesses, match];
    setGuesses(newGuesses);
    setSearchTerm("");
    setDropdownOpen(false);

    if (dish.id === targetDish.id) {
      setGameState("won");
      setModalOpen(true); // Open modal on win
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState("lost");
      setModalOpen(true); // Open modal on loss
    }
  };

  const getCellColor = (status: "correct" | "close" | "wrong" | boolean) => {
    if (status === true || status === "correct") return "bg-alma-green border-alma-green text-white";
    if (status === "close") return "bg-alma-orange border-alma-orange text-white";
    return "bg-white border-alma-text text-alma-text";
  };

  if (!targetDish) return <h1>Something went wrong, please refresh this page</h1>;

  return (
    <>
      <PixelatedImage attempt={gameState === "won" ? 10 : guesses.length} seed={dishSeed} random={random} />

      <ShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        guesses={guesses}
        targetDish={targetDish}
        gameState={gameState}
        max_attempts={MAX_ATTEMPTS}
        random={random}
      />

      {/* Search Input */}
      {gameState === "playing" && (
        <div className="w-full max-w-[500px] relative mb-12 z-20">
          <div className="relative w-full group">
            {/* Decorational header on search bar */}
            <div className="absolute -top-3 left-6 right-6 h-3 bg-gradient-to-r from-alma-text/0 via-alma-text/0 to-alma-text/0 flex justify-center z-10">
              {/* Yellow accent line */}
              <div className="w-32 h-1.5 bg-alma-accent rounded-full border border-alma-border/20"></div>
            </div>

            <div
              className={`
              absolute inset-0 bg-[#8b2e2e] rounded-full border-2 border-alma-border shadow-lg
              transform -rotate-1 peer-focus-within:rotate-0 transition-transform duration-300
            `}
            ></div>

            <div className="absolute inset-0 bg-[#6B1E1E] rounded-full border-2 border-alma-border shadow-inner"></div>

            <div className="relative flex items-center bg-white m-2 rounded-full overflow-hidden border border-gray-200 shadow-inner h-12 peer">
              <input
                className="w-full pl-6 pr-12 bg-transparent focus:outline-none text-lg font-medium text-gray-700 placeholder:text-gray-400"
                placeholder="Raad het gerecht... (Typ om te zoeken)"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                <Search className="w-5 h-5" />
              </div>
            </div>
          </div>

          {dropdownOpen && searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-alma-text rounded-xl shadow-xl overflow-hidden z-30">
              <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                {filteredDishes.map((dish) => (
                  <li
                    key={dish.id}
                    onClick={() => handleGuess(dish as Dish)}
                    className="px-5 py-3 hover:bg-alma-bg/30 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium">{dish.name}</span>
                    <span className="text-sm text-gray-400 group-hover:text-alma-text transition-colors">
                      Selecteer
                    </span>
                  </li>
                ))}
                {filteredDishes.length === 0 && (
                  <li className="px-5 py-4 text-gray-500 text-center italic">Geen gerechten gevonden</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Headers */}
      <div className="w-full max-w-[600px] grid grid-cols-5 gap-2 sm:gap-3 mb-2 px-2">
        <div className="flex flex-col items-center gap-1 text-alma-text">
          <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Diet</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-alma-text">
          <Wheat className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Carbs</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-alma-text">
          <Euro className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Prijs</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-alma-text">
          <TriangleAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Allergenen</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-alma-text">
          <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Naam</span>
        </div>
      </div>

      {/* Guesses */}
      <div className="w-full max-w-[600px] flex flex-col gap-2 sm:gap-3 px-2">
        {guesses.map((guess, idx) => (
          <div
            key={idx}
            className="grid grid-cols-5 gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div
              className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(
                guess.matches.diet
              )}`}
            >
              {guess.dish.diet}
            </div>
            <div
              className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(
                guess.matches.carb_source
              )}`}
            >
              {guess.dish.carb_source}
            </div>
            <div
              className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(
                guess.matches.price
              )}`}
            >
              €{guess.dish.price_student.toFixed(2)}
            </div>
            <div
              className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(
                guess.matches.allergenCount
              )}`}
            >
              {guess.dish.allergens?.length || 0}
            </div>
            <div
              className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(
                guess.matches.nameLength
              )}`}
            >
              <div className="flex items-center gap-1">
                {guess.dish.name.length}
                {guess.matches.nameLength !== "correct" &&
                  (guess.matches.nameLengthDiff > 0 ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  ))}
              </div>
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, MAX_ATTEMPTS - guesses.length) }).map((_, idx) => (
          <div key={`empty-${idx}`} className="grid grid-cols-5 gap-2 sm:gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-transparent border-2 border-alma-text/40 rounded-lg h-10 sm:h-12"></div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// Types
export type Dish = {
  id: number;
  name: string;
  image_url: string;
  category: string;
  diet: string;
  carb_source: string;
  price_student: number;
  allergens?: string[];
};

export type GuessResult = {
  dish: Dish;
  matches: {
    category: boolean;
    diet: boolean;
    carb_source: boolean;
    price: "correct" | "close" | "wrong";
    priceValue: string;
    allergenCount: "correct" | "close" | "wrong";
    nameLength: "correct" | "close" | "wrong";
    nameLengthDiff: number;
  };
};
