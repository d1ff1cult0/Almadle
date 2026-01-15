'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Shrikhand, Caveat } from 'next/font/google';
import Image from 'next/image';
import almaFoodData from '../data/alma_food.json';
import { Leaf, Wheat, Euro, TriangleAlert, ChefHat, Search, Share2, X, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { getDailyDish } from './utils/dailyDish';

const shrikhand = Shrikhand({
  weight: '400',
  subsets: ['latin'],
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: '700',
});

// Types
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

type GuessResult = {
  dish: Dish;
  matches: {
    category: boolean;
    diet: boolean;
    carb_source: boolean;
    price: 'correct' | 'close' | 'wrong';
    priceValue: string;
    allergenCount: 'correct' | 'close' | 'wrong';
    nameLength: 'correct' | 'close' | 'wrong';
    nameLengthDiff: number;
  };
};

const MAX_ATTEMPTS = 6;

// Pixelated Image Component using Server-Side API
const PixelatedImage = ({ attempt, dateKey }: { attempt: number; dateKey: string }) => {
  // Use current timestamp to bust cache if needed, but next/image should handle caching.
  // We pass 'stage' to the API.
  const stage = attempt; // 0 to MAX_ATTEMPTS
  // Construct API URL
  const imageUrl = `/api/image?date=${dateKey}&stage=${stage}`;

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
          Vandaag's Gerecht
        </div>
      </div>
    </div>
  );
};

// Share Modal Component
const ShareModal = ({
  isOpen,
  onClose,
  guesses,
  targetDish,
  gameState
}: {
  isOpen: boolean;
  onClose: () => void;
  guesses: GuessResult[];
  targetDish: Dish;
  gameState: 'won' | 'lost' | 'playing';
}) => {
  if (!isOpen) return null;

  const handleShare = () => {
    // Generate emoji grid
    let shareText = `Almadle ${new Date().toLocaleDateString()}\n`;
    shareText += `Gereden in ${guesses.length}/${MAX_ATTEMPTS}\n\n`;

    guesses.forEach(g => {
      // logic for emojis: 
      // Green square for correct, Yellow for close, Black/White for wrong?
      // Let's use squares.
      const getEmoji = (status: 'correct' | 'close' | 'wrong' | boolean) => {
        if (status === 'correct' || status === true) return '🟩';
        if (status === 'close') return '🟨';
        return '⬜';
      };
      shareText += `${getEmoji(g.matches.diet)}${getEmoji(g.matches.carb_source)}${getEmoji(g.matches.price)}${getEmoji(g.matches.allergenCount)}${getEmoji(g.matches.nameLength)}\n`;
    });

    navigator.clipboard.writeText(shareText);
    alert('Resultaten gekopieerd naar klembord!');
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
            {gameState === 'won' ? `Gefeliciteerd! Je hebt het geraden in ${guesses.length} pogingen!` : 'Volgende keer beter!'}
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
              <button onClick={handleShare} className="bg-alma-green text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 transition-colors w-full justify-center shadow-md">
                <Share2 className="w-5 h-5" />
                Deel Resultaat
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [targetDish, setTargetDish] = useState<Dish | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  // Initialize game
  useEffect(() => {
    // Pick daily dish seeded
    const dish = getDailyDish();
    setTargetDish(dish as Dish);
  }, []);

  const filteredDishes = useMemo(() => {
    if (!searchTerm) return [];
    return almaFoodData
      .filter((dish) =>
        dish.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !guesses.some((g) => g.dish.id === dish.id)
      )
      .slice(0, 5); // Limit limit results
  }, [searchTerm, guesses]);

  const handleGuess = (dish: Dish) => {
    if (!targetDish || gameState !== 'playing') return;

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
        price: priceDiff === 0 ? 'correct' : priceDiff <= 1.0 ? 'close' : 'wrong',
        priceValue: priceDiff === 0 ? 'correct' : priceDiff <= 1.0 ? (dish.price_student > targetDish.price_student ? 'lower' : 'higher') : 'wrong', // We could add directional arrow for price too? Request only mentioned Name.
        allergenCount: allergenDiff === 0 ? 'correct' : allergenDiff <= 2 ? 'close' : 'wrong',
        nameLength: lengthDiff === 0 ? 'correct' : Math.abs(lengthDiff) <= 3 ? 'close' : 'wrong',
        nameLengthDiff: lengthDiff,
      }
    };

    const newGuesses = [...guesses, match];
    setGuesses(newGuesses);
    setSearchTerm('');
    setDropdownOpen(false);

    if (dish.id === targetDish.id) {
      setGameState('won');
      setModalOpen(true); // Open modal on win
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      setModalOpen(true); // Open modal on loss
    }
  };

  const getCellColor = (status: 'correct' | 'close' | 'wrong' | boolean) => {
    if (status === true || status === 'correct') return 'bg-alma-green border-alma-green text-white';
    if (status === 'close') return 'bg-alma-orange border-alma-orange text-white';
    return 'bg-white border-alma-text text-alma-text';
  };

  if (!targetDish) return null;

  return (
    <main className="w-full min-h-screen flex flex-col items-center py-10 px-4 bg-alma-bg text-alma-text selection:bg-alma-accent/30">

      <h1 className={`${shrikhand.className} text-[5.5rem] leading-tight mb-8 text-alma-text drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)]`}>Almadle</h1>

      <PixelatedImage
        dateKey={new Date().toISOString().split('T')[0]} // Use today's date YYYY-MM-DD
        attempt={gameState === 'won' ? 10 : guesses.length}
      />

      <ShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        guesses={guesses}
        targetDish={targetDish}
        gameState={gameState}
      />

      {/* Game Over Message */}
      {gameState !== 'playing' && (
        <div className="mb-8 text-center p-6 bg-white border-2 border-alma-text rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <h2 className={`text-3xl font-bold mb-2 ${shrikhand.className}`}>
            {gameState === 'won' ? 'Proficiat!' : 'Helaas!'}
          </h2>
          <p className="text-lg mb-4">Het gerecht was: <strong>{targetDish.name}</strong></p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-alma-text text-white rounded-lg font-bold hover:bg-opacity-90 transition-colors shadow-md"
          >
            Nog eens spelen
          </button>
        </div>
      )}

      {/* Search Input */}
      {gameState === 'playing' && (
        <div className="w-full max-w-[500px] relative mb-12 z-20">
          <div className="relative w-full group">
            {/* Decorational header on search bar */}
            <div className="absolute -top-3 left-6 right-6 h-3 bg-gradient-to-r from-alma-text/0 via-alma-text/0 to-alma-text/0 flex justify-center z-10">
              {/* Yellow accent line */}
              <div className="w-32 h-1.5 bg-alma-accent rounded-full border border-alma-border/20"></div>
            </div>

            <div className={`
              absolute inset-0 bg-[#8b2e2e] rounded-full border-2 border-alma-border shadow-lg
              transform -rotate-1 peer-focus-within:rotate-0 transition-transform duration-300
            `}></div>

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
                    <span className="text-sm text-gray-400 group-hover:text-alma-text transition-colors">Selecteer</span>
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
          <div key={idx} className="grid grid-cols-5 gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(guess.matches.diet)}`}>
              {guess.dish.diet}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(guess.matches.carb_source)}`}>
              {guess.dish.carb_source}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(guess.matches.price)}`}>
              €{guess.dish.price_student.toFixed(2)}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(guess.matches.allergenCount)}`}>
              {guess.dish.allergens?.length || 0}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm transition-all hover:scale-105 ${getCellColor(guess.matches.nameLength)}`}>
              <div className="flex items-center gap-1">
                {guess.dish.name.length}
                {guess.matches.nameLength !== 'correct' && (
                  guess.matches.nameLengthDiff > 0 ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                )}
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

    </main>
  );
}
