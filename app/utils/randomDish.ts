import almaFoodData from "../../data/alma_food.json";

/**
 * Deterministic pseudo-random number in [0, 1)
 * Same input string => same output
 */
export function stringToRandom01(input: string): number {
  let hash = 0x811c9dc5; // FNV-1a offset basis

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Convert to unsigned 32-bit and normalize
  return (hash >>> 0) / 0x100000000; // 2^32
}

export function getRandomDish(input: string) {
  const random = stringToRandom01(input);

  const randomIndex = Math.floor(random * almaFoodData.length);
  return almaFoodData[randomIndex];
}

export function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
