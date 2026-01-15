'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Kaushan_Script } from 'next/font/google';
import Image from 'next/image';
import almaFoodData from '../data/alma_food.json';

const kaushan = Kaushan_Script({
  weight: '400',
  subsets: ['latin'],
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
    allergenCount: 'correct' | 'close' | 'wrong';
    nameLength: 'correct' | 'close' | 'wrong';
  };
};

const MAX_ATTEMPTS = 6;

// Pixelated Image Component
const PixelatedImage = ({ src, attempt }: { src: string; attempt: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Pixelation factor: starts high (blurry), goes to 1 (clear)
  // attempt 0: factor 20? attempt 6: factor 1
  const pixelFactor = Math.max(1, 40 - attempt * 7);

  useEffect(() => {
    const img = document.createElement('img');
    img.src = src;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, [src]);

  useEffect(() => {
    if (imageLoaded && canvasRef.current && imgRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imgRef.current;

      if (!ctx) return;

      // Draw small
      const w = canvas.width;
      const h = canvas.height;
      
      // Turn off smoothing to keep pixels sharp when scaling up
      ctx.imageSmoothingEnabled = false;

      // Calculate the size of the small image
      const sw = w / pixelFactor;
      const sh = h / pixelFactor;

      // Draw image small
      ctx.drawImage(img, 0, 0, sw, sh);

      // Draw image back large
      ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, w, h);
    }
  }, [imageLoaded, pixelFactor]);

  return (
    <div className="mb-8 shadow-lg border-4 border-[#1e3a8a] rounded-sm bg-white overflow-hidden w-full max-w-[350px] h-[250px] relative">
      <canvas
        ref={canvasRef}
        width={350}
        height={250}
        className="w-full h-full object-cover"
      />
      {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
    </div>
  );
};

export default function Home() {
  const [targetDish, setTargetDish] = useState<Dish | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Initialize game
  useEffect(() => {
    // Pick random dish
    // Ideally use today's date for daily challenge, but random for now as requested "game"
    const randomDish = almaFoodData[Math.floor(Math.random() * almaFoodData.length)];
    setTargetDish(randomDish as Dish);
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
    const lengthDiff = Math.abs(dish.name.length - targetDish.name.length);

    const match: GuessResult = {
      dish,
      matches: {
        category: dish.category === targetDish.category,
        diet: dish.diet === targetDish.diet,
        carb_source: dish.carb_source === targetDish.carb_source,
        price: priceDiff === 0 ? 'correct' : priceDiff <= 1.0 ? 'close' : 'wrong',
        allergenCount: allergenDiff === 0 ? 'correct' : allergenDiff <= 2 ? 'close' : 'wrong',
        nameLength: lengthDiff === 0 ? 'correct' : lengthDiff <= 3 ? 'close' : 'wrong',
      }
    };

    const newGuesses = [...guesses, match];
    setGuesses(newGuesses);
    setSearchTerm('');
    setDropdownOpen(false);

    if (dish.id === targetDish.id) {
      setGameState('won');
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState('lost');
    }
  };

  const getCellColor = (status: 'correct' | 'close' | 'wrong' | boolean) => {
    if (status === true || status === 'correct') return 'bg-alma-green text-white';
    if (status === 'close') return 'bg-alma-orange text-white';
    return 'bg-alma-grey text-white';
  };

  if (!targetDish) return null;

  return (
    <main className="w-full max-w-2xl px-4 flex flex-col items-center mt-4 mb-20 mx-auto">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className={`${kaushan.className} text-[3.5rem] leading-none text-alma-text`}>Alma</div>
          <div className="h-12 w-px bg-alma-text"></div>
          <div className="flex flex-col justify-center text-alma-text leading-tight">
            <span className="text-[0.7rem] uppercase tracking-wide font-normal">KU Leuven</span>
            <span className="text-[0.9rem] font-bold uppercase tracking-wide">Student Restaurant</span>
            <span className="text-[0.7rem] uppercase tracking-wide font-normal">Est. 1954</span>
          </div>
        </div>
        <nav className="hidden sm:block">
            <ul className="flex space-x-6 text-lg font-medium text-alma-text">
                <li><a href="#" className="hover:underline">Hoe spelen?</a></li>
                <li><a href="#" className="hover:underline">Statistieken</a></li>
                <li><a href="#" className="hover:underline">Instellingen</a></li>
            </ul>
        </nav>
      </header>
      
      <h1 className="text-5xl font-serif font-bold text-alma-text mb-8">Alma Wordle</h1>

      <PixelatedImage 
        src={gameState === 'won' ? targetDish.image_url : targetDish.image_url} 
        attempt={gameState === 'won' ? 10 : guesses.length} 
      />

      {/* Game Over Message */}
      {gameState !== 'playing' && (
        <div className="mb-8 text-center p-4 bg-white/50 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">
            {gameState === 'won' ? '🎉 Proficiat!' : '😞 Helaas!'}
          </h2>
          <p className="text-lg">Het gerecht was: <strong>{targetDish.name}</strong></p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-alma-text text-white rounded hover:bg-opacity-90"
          >
            Nog eens spelen
          </button>
        </div>
      )}

      {/* Search Input */}
      {gameState === 'playing' && (
        <div className="w-full max-w-[500px] relative mb-12">
          <div className="relative w-full">
            <input 
              className="w-full pl-4 pr-10 py-3 rounded-md border border-gray-400 focus:outline-none focus:border-alma-text text-gray-700 bg-white shadow-sm placeholder-gray-500"
              placeholder="Raad het gerecht... (Typ om te zoeken)" 
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          
          {dropdownOpen && searchTerm && (
            <ul className="absolute z-10 w-full bg-white border border-t-0 border-gray-400 rounded-b-md overflow-hidden shadow-lg max-h-60 overflow-y-auto">
              {filteredDishes.map((dish) => (
                <li 
                  key={dish.id}
                  onClick={() => handleGuess(dish as Dish)}
                  className="px-4 hover:bg-gray-100 cursor-pointer text-gray-800 border-b border-gray-100 py-3 last:border-0"
                >
                  {dish.name}
                </li>
              ))}
              {filteredDishes.length === 0 && (
                <li className="px-4 py-3 text-gray-500">Geen gerechten gevonden</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Headers */}
      <div className="w-full max-w-[600px] grid grid-cols-5 gap-3 mb-2 text-center text-sm font-bold text-alma-text">
        <div>Diet</div>
        <div>Carb</div>
        <div>Prijs</div>
        <div>Allergenen</div>
        <div>Naam</div>
      </div>

      {/* Guesses */}
      <div className="w-full max-w-[600px] flex flex-col gap-3">
        {guesses.map((guess, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-3">
                 <div className={`game-grid-cell ${getCellColor(guess.matches.diet)} shadow-sm flex items-center justify-center p-2 rounded text-sm`}>
                    {guess.dish.diet}
                </div>
                <div className={`game-grid-cell ${getCellColor(guess.matches.carb_source)} shadow-sm flex items-center justify-center p-2 rounded text-sm`}>
                    {guess.dish.carb_source}
                </div>
                <div className={`game-grid-cell ${getCellColor(guess.matches.price)} shadow-sm flex items-center justify-center p-2 rounded text-sm`}>
                   €{guess.dish.price_student.toFixed(2)}
                </div>
                <div className={`game-grid-cell ${getCellColor(guess.matches.allergenCount)} shadow-sm flex items-center justify-center p-2 rounded text-sm leading-tight text-center px-1`}>
                    {guess.dish.allergens?.length || 0}
                </div>
                <div className={`game-grid-cell ${getCellColor(guess.matches.nameLength)} shadow-sm flex items-center justify-center p-2 rounded text-sm`}>
                    {guess.dish.name.length}
                </div>
            </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, MAX_ATTEMPTS - guesses.length) }).map((_, idx) => (
           <div key={`empty-${idx}`} className="grid grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => (
                   <div key={i} className="game-grid-cell bg-white border-2 border-gray-400 shadow-sm h-[45px] rounded"></div> 
                ))}
           </div> 
        ))}
      </div>

    </main>
  );
}
