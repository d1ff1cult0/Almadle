import * as fs from "fs";
import readline from "readline";

const nameDict: Map<string, string> = new Map();

export async function parseNameFile(dishesFile: string) {
  try {
    await fs.promises.access(dishesFile);
  } catch {
    throw new Error(`file <${dishesFile}> doesn't exist`);
  }
  const dataStream = fs.createReadStream(dishesFile, "utf8");
  const lines = readline.createInterface({
    input: dataStream,
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    const row = line.split(",");
    nameDict.set(row[1], row.at(-1) as string);
  }

  lines.close();
  dataStream.destroy();
}

export function lookupDishName(id: string): string {
  return nameDict.get(id)!;
}

export async function lookupDish(id: string, dishesFile: string): Promise<string> {
  try {
    await fs.promises.access(dishesFile);
  } catch {
    throw new Error(`file <${dishesFile}> doesn't exist`);
  }
  const dataStream = fs.createReadStream(dishesFile, "utf8");
  const lines = readline.createInterface({
    input: dataStream,
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    const row = line.split(",");
    if (row[1] === id) {
      lines.close();
      dataStream.destroy();
      return row.at(-1) as string;
    }
  }

  return "";
}
