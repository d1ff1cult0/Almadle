/* --- Types --- */
export type Dish = {
  name: string;
  image_url: string;
  category: string;
  diet: Diet;
  carb_source: CarbSource;
  price_student: number;
  env_score: Env_Score;
  allergens: string[];
};

export const Categorie = [
  "Hoofdgerecht",
  "Soep",
  "Snack",
  "Salade",
  "Drank",
  "Ontbijt",
  "Dessert",
  "Broodje",
  "Andere",
];
export type Diet = "Vlees" | "Gevogelte" | "Vis" | "Vis & Vlees" | "Vegetarisch" | "Vegan";
export type CarbSource = "Aardappel" | "Granen" | "Pasta" | "Geen" | "Brood";
export type Env_Score = "A" | "B" | "C" | "D" | "F";
export const Allergen = [
  "Ei",
  "Gluten",
  "Mosterd",
  "Melk",
  "Sulfiet",
  "Noten",
  "Selderij",
  "Soya",
  "Pindanoten",
  "Vis",
  "Schaaldieren",
  "Sesam",
];

/**""
 * ALMA RESTAURANT_ID's
 *
 * 1 => 1
 * 2 => 2
 * 5 => 3
 * 41, 30 => Quadrivium
 * 6 => ESAT2
 * 7 => De Moete
 * 3 => Groep T
 * 4 => 't Academisch kwartier
 * 8 => Gasthuisberg
 * 40 => GHB Sandwich Corner
 */
