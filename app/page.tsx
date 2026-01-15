'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Caveat, Shrikhand } from 'next/font/google';
import { ChefHat, ChevronDown, ChevronUp, Euro, Leaf, Search, Share2, TriangleAlert, Wheat, X } from 'lucide-react';

const shrikhand = Shrikhand({ weight: '400', subsets: ['latin'] });
const caveat = Caveat({ weight: '700', subsets: ['latin'] });

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
    priceValue: 'correct' | 'higher' | 'lower' | 'wrong';
    allergenCount: 'correct' | 'close' | 'wrong';
    nameLength: 'correct' | 'close' | 'wrong';
    nameLengthDiff: number;
  };
};

const MAX_ATTEMPTS = 6;

const PixelatedImage = ({
  refreshKey,
  attempt,
  playing,
}: {
  refreshKey: string;
  attempt: number;
  playing: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const BASE_W = 300;
  const BASE_H = 225;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setImageLoaded(false);
      if (bitmapRef.current) {
        bitmapRef.current.close();
        bitmapRef.current = null;
      }

      const res = await fetch(`/api/game/image?t=${encodeURIComponent(refreshKey)}`, {
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!res.ok) return;

      const blob = await res.blob();
      if (cancelled) return;
      const bitmap = await createImageBitmap(blob);
      if (cancelled) {
        bitmap.close();
        return;
      }

      bitmapRef.current = bitmap;
      setImageLoaded(true);
    }

    load().catch(() => {});
    return () => {
      cancelled = true;
      controller.abort();
      if (bitmapRef.current) {
        bitmapRef.current.close();
        bitmapRef.current = null;
      }
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !bitmapRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = bitmapRef.current;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(BASE_W * dpr);
    canvas.height = Math.floor(BASE_H * dpr);
    canvas.style.width = `${BASE_W}px`;
    canvas.style.height = `${BASE_H}px`;

    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, BASE_W, BASE_H);

    if (!playing) {
      ctx.drawImage(img, 0, 0, BASE_W, BASE_H);
      return;
    }

    // Client-side pixelation pass (guarantees visible blocks regardless of display smoothing)
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    const temp = tempCanvasRef.current;
    const tctx = temp.getContext('2d');
    if (!tctx) return;

    const stepIdx = Math.min(5, Math.max(0, attempt));
    const smallWSteps = [8, 10, 13, 18, 29, 70];
    const smallW = smallWSteps[stepIdx]!;
    const smallH = Math.max(1, Math.round((smallW * BASE_H) / BASE_W));

    temp.width = smallW;
    temp.height = smallH;
    tctx.imageSmoothingEnabled = false;
    tctx.clearRect(0, 0, smallW, smallH);
    tctx.drawImage(img, 0, 0, smallW, smallH);

    ctx.drawImage(temp, 0, 0, smallW, smallH, 0, 0, BASE_W, BASE_H);
  }, [imageLoaded, attempt, playing]);

  return (
    <div className="relative transform rotate-[-2deg] mb-12 transition-transform hover:rotate-0 duration-300">
      <div className="bg-white p-3 pb-12 shadow-xl border border-gray-200">
        <div className="border border-gray-100 bg-gray-50 overflow-hidden w-[300px] h-[225px] relative">
          <canvas ref={canvasRef} className="w-full h-full object-cover pixelated-canvas" />
          {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        </div>
        <div className={`absolute bottom-4 left-0 right-0 text-center ${caveat.className} text-3xl text-alma-text`}>
          Vandaag&apos;s Gerecht
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({
  isOpen,
  onClose,
  guesses,
  gameState,
}: {
  isOpen: boolean;
  onClose: () => void;
  guesses: GuessResult[];
  gameState: 'won' | 'lost' | 'playing';
}) => {
  if (!isOpen) return null;

  const handleShare = () => {
    let shareText = `Almadle ${new Date().toLocaleDateString()}\n`;
    shareText += `Voltooid in ${guesses.length}/${MAX_ATTEMPTS}\n\n`;

    const getEmoji = (status: 'correct' | 'close' | 'wrong' | boolean) => {
      if (status === 'correct' || status === true) return '🟩';
      if (status === 'close') return '🟨';
      return '⬜';
    };

    guesses.forEach((g) => {
      shareText += `${getEmoji(g.matches.diet)}${getEmoji(g.matches.carb_source)}${getEmoji(g.matches.price)}${getEmoji(g.matches.allergenCount)}${getEmoji(g.matches.nameLength)}\n`;
    });

    navigator.clipboard.writeText(shareText).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Game Complete</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center text-center">
          <h3 className="text-alma-green font-bold text-lg mb-6">
            {gameState === 'won'
              ? `Gefeliciteerd! Je hebt het geraden in ${guesses.length} pogingen!`
              : 'Volgende keer beter!'}
          </h3>
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
  );
};

export default function Home() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [answerName, setAnswerName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await fetch('/api/game/start?new=1', { cache: 'no-store' }).catch(() => {});
      if (!cancelled) setGameReady(true);

      const res = await fetch('/api/dishes');
      if (!res.ok) return;
      const data = (await res.json()) as Dish[];
      if (cancelled) return;
      setDishes(data);
    }
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDishes = useMemo(() => {
    if (!searchTerm) return [];
    return dishes
      .filter(
        (dish) =>
          dish.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !guesses.some((g) => g.dish.id === dish.id)
      )
      .slice(0, 5);
  }, [searchTerm, guesses, dishes]);

  const handleGuess = (dish: Dish) => {
    if (gameState !== 'playing') return;

    setSearchTerm('');
    setDropdownOpen(false);

    fetch('/api/game/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessId: dish.id }),
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data:
            | null
            | { guess?: GuessResult; state?: 'playing' | 'won' | 'lost'; target?: { name: string } | null }
        ) => {
          if (!data?.guess || !data.state) return;
          setGuesses((prev) => [...prev, data.guess as GuessResult]);
          setGameState(data.state);
          if (data.state !== 'playing') {
            setModalOpen(true);
            if (data.target?.name) setAnswerName(data.target.name);
          }
        }
      )
      .catch(() => {});
  };

  const getCellColor = (status: 'correct' | 'close' | 'wrong' | boolean) => {
    if (status === true || status === 'correct') return 'bg-alma-green border-alma-green text-white';
    if (status === 'close') return 'bg-alma-orange border-alma-orange text-white';
    return 'bg-white border-alma-text text-alma-text';
  };

  if (dishes.length === 0) return null;

  return (
    <main className="w-full min-h-screen flex flex-col items-center py-10 px-4 bg-alma-bg text-alma-text selection:bg-alma-accent/30">
      <h1
        className={`${shrikhand.className} text-[5.5rem] leading-tight mb-8 text-alma-text drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)]`}
      >
        Almadle
      </h1>

      {gameReady && (
        <PixelatedImage refreshKey={`${gameState}:${guesses.length}`} attempt={guesses.length} playing={gameState === 'playing'} />
      )}

      <ShareModal isOpen={modalOpen} onClose={() => setModalOpen(false)} guesses={guesses} gameState={gameState} />

      {gameState !== 'playing' && (
        <div className="mb-8 text-center p-6 bg-white border-2 border-alma-text rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <h2 className={`text-3xl font-bold mb-2 ${shrikhand.className}`}>
            {gameState === 'won' ? 'Proficiat!' : 'Helaas!'}
          </h2>
          <p className="text-lg mb-4">
            Het gerecht was: <strong>{answerName ?? '...'}</strong>
          </p>
          <button
            onClick={async () => {
              await fetch('/api/game/start?new=1', { cache: 'no-store' }).catch(() => {});
              window.location.reload();
            }}
            className="px-6 py-2 bg-alma-text text-white rounded-lg font-bold hover:bg-opacity-90 transition-colors shadow-md"
          >
            Nog eens spelen
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="w-full max-w-[500px] relative mb-12 z-20">
          <div className="relative w-full group">
            <div className="absolute -top-3 left-6 right-6 h-3 flex justify-center z-10">
              <div className="w-32 h-1.5 bg-alma-accent rounded-full border border-alma-border/20"></div>
            </div>

            <div
              className={`
                absolute inset-0 bg-[#8b2e2e] rounded-full border-2 border-alma-border shadow-lg
                transform -rotate-1 transition-transform duration-300
              `}
            ></div>
            <div className="absolute inset-0 bg-[#6B1E1E] rounded-full border-2 border-alma-border shadow-inner"></div>

            <div className="relative flex items-center bg-white m-2 rounded-full overflow-hidden border border-gray-200 shadow-inner h-12">
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

      <div className="w-full max-w-[600px] flex flex-col gap-2 sm:gap-3 px-2">
        {guesses.map((guess, idx) => (
          <div key={idx} className="grid grid-cols-5 gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm ${getCellColor(guess.matches.diet)}`}>
              {guess.dish.diet}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm ${getCellColor(guess.matches.carb_source)}`}>
              {guess.dish.carb_source}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm ${getCellColor(guess.matches.price)}`}>
              €{guess.dish.price_student.toFixed(2)}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm ${getCellColor(guess.matches.allergenCount)}`}>
              {guess.dish.allergens?.length || 0}
            </div>
            <div className={`border-2 rounded-lg flex items-center justify-center h-10 sm:h-12 text-sm sm:text-base font-medium shadow-sm ${getCellColor(guess.matches.nameLength)}`}>
              <div className="flex items-center gap-1">
                {guess.dish.name.length}
                {guess.matches.nameLength !== 'correct' && (
                  guess.matches.nameLengthDiff > 0 ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>
        ))}

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


