/**
@author Witse Panneels

npm run parse-dishes
*/
import * as fs from "fs";
import * as path from "path";
import readline from "readline";
import { pipeline } from "stream/promises";
import { Dish, Categorie, Allergen, Diet } from "./types.mjs";
import { lookupDishName, parseNameFile } from "./dishLookup.mjs";

/* --- Parameters --- */
const inputFolder = "./data/Dishes Export 14-01-2026";
const outputFile = "./data/alma_food.json";
const outputImageFolder = "./data/images";
const allowedRestaurantIDs = new Set(["1", "2", "5", "41", "30", "6", "7", "3", "4", "8", "40"]);

/* --- parser --- */
const dishes: Map<string, Dish> = new Map();

console.log("loading names");
fs.writeFileSync(outputFile, "", "utf8"); // clear target file
await parseNameFile(path.join(inputFolder, "dish_translations_nl.csv"));
console.log("names loaded");

// open dishes.csv and split file into separate lines
try {
  await fs.promises.access(inputFolder);
} catch {
  throw new Error(`input directory <${inputFolder}> doesn't exist`);
}
const dataStream = fs.createReadStream(path.join(inputFolder, "dishes.csv"), "utf8");
const lines = readline.createInterface({
  input: dataStream,
  crlfDelay: Infinity,
});

let current_line = 0; // keep track of current dish
for await (const line of lines) {
  current_line++;
  if (current_line === 1) continue; // skip first line

  const dish = await csvLineParse(line);

  if (allowedRestaurantIDs.has(dish[1])) {
    const newDish = parseDish(dish);
    if (!dishes.has(newDish.name) && newDish.image_url !== "" && newDish.category == "Hoofdgerecht") {
      dishes.set(newDish.name, newDish);
    }
  }
  // if (current_line > 50) break; // dont parse whole file when testing;
}

console.log(`Extracted ${dishes.size} unique dishes`);

/* count dishes per category */
// const counts: Map<string, number> = new Map();
// for (const dish of dishes.values()) {
//   if (counts.has(dish.category)) {
//     const temp = counts.get(dish.category)!;
//     counts.set(dish.category, temp + 1);
//   } else {
//     counts.set(dish.category, 1);
//   }
// }

// console.log(counts);

/* download images */
console.log(`Downloading Images to ${outputImageFolder}`);
for (const dish of dishes.values()) {
  const filename = path.parse(dish.image_url).base;
  const newUrl = path.join("images", filename);
  console.log(newUrl);
  await downloadImage(dish.image_url, path.join(".", "data", newUrl));

  dish.image_url = newUrl;
}

const dishesArray: DishWithId[] = Array.from(dishes.values()).map((dish, index) => ({
  id: index + 1, // IDs start at 1
  ...dish,
}));

await fs.writeFile(outputFile, JSON.stringify(dishesArray, null, 2), () => {});

console.log("Done!");

/* --- helper functions --- */
// ID,Restaurant ID,Vegetarian,Created At,Updated At,Fixed,Valuta,Day,Prices,Vegan,Allergens,Daily,Meal Category,Image URL
// 114935959,8,false,"14/1/2026, 17:49","14/1/2026, 17:49",true,EUR,"20/1/2026, 00:00",{1.95},true,0,false,4,
function parseDish(dish: string[]): Dish {
  const allergenen = getAllergens(Number(dish[10].replace(",", "")));
  const dieet = getDiet(Boolean(dish[9]), allergenen);

  return {
    name: lookupDishName(dish[0]),
    image_url: dish[13],
    category: Categorie[Number(dish[12])],
    diet: dieet,
    carb_source: "Aardappel",
    price_student: Number(dish[8].replace(/[{}]/g, "")),
    allergens: allergenen,
  };
}

function csvLineParse(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function getAllergens(input: number): string[] {
  const bits = input.toString(2).split("").reverse(); // get reversed bit representation this way bits[0] is the least significant bit
  const result: string[] = [];

  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") {
      result.push(Allergen[i]);
    }
  }

  return result;
}

function getDiet(vegi: boolean, allergenen: string[]): Diet {
  if (vegi) {
    if (allergenen.includes("Ei") || allergenen.includes("Melk") || allergenen.includes("Melk")) return "Vegetarisch";
    return "Vegan";
  }

  if (allergenen.includes("Vis") || allergenen.includes("Schaaldieren")) return "Vis";

  return "Vlees";
}

type DishWithId = Dish & {
  id: number;
};

export async function downloadImage(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download image: ${res.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pipeline(res.body as any, fs.createWriteStream(outputPath));
  //unsafe any call, but I dont care
}
