/**
 * @author witse panneels
 * @date updated-date-as-2025-10-27
 */

import * as fs from "fs";
import readline from "readline";
import {
  normalizeSpaces,
  removeCommonWords,
  removePunctuation,
  normalizeUnicode,
  lowerCase,
} from "../text-tools/filters.mjs";

interface WordEntry {
  word: string;
  senses: [{ glosses: string[] }];
}

interface WordEntry {
  word: string;
  senses: [{ glosses: string[] }];
}

/**
 * Preprocesses a source dictionary file (`.jsonl`) into a clean `.txt` dictionary format.
 *
 * @remarks   Each JSON line should contain a word and its definitions (similar to Wiktionary data).
 * The function reads the file line-by-line for efficiency, filters invalid entries,
 * and applies normalization steps before writing results to the output file.
 *
 * Normalization steps:
 * - `normalizeUnicode` — remove diacritics
 * - `removePunctuation` — strip punctuation
 * - `removeCommonWords` — filter out common stop words
 * - `normalizeSpaces` — collapse multiple spaces
 * - `lowerCase` — convert to lowercase
 * Output format:
 * ```
 * word
 * definition
 *
 * ```
 * (Each word-definition pair separated by a blank line.)
 *
 * @param input   The path to the source dictionary '.jsonl' file
 * @param output   The path where the processed text dictionary should be written
 *
 * @throws {Error}   If the input file does not exist or cannot be accessed
 * @throws {SyntaxError}   If any line in the JSONL file cannot be parsed as valid JSON
 */
export async function preprocessDict(input: string, output: string) {
  try {
    await fs.promises.access(input);
  } catch {
    throw new Error("input file doesn't exist");
  }
  const dataStream = fs.createReadStream(input, "utf8"); // create read stream
  const lines = readline.createInterface({
    // split file in separate lines otherwise JSON.parse gets confused
    input: dataStream,
    crlfDelay: Infinity,
  });

  fs.writeFileSync(output, "", "utf8"); // clear target file

  //const words: string[][] = [];

  for await (const x of lines) {
    if (!x.trim()) {
      continue; // skip if empty line (end of file)
    }

    const word = JSON.parse(x) as WordEntry;

    if (word.senses[0].glosses === undefined) {
      continue; // ignore non word-definition wiktionary pages
    }
    word.word = applyFilters(word.word);
    word.senses[0].glosses[0] = applyFilters(
      word.senses[0].glosses[0] as string
    );
    if (word.word.length > 0 && word.senses[0].glosses[0].length > 1) {
      const entry = "" + word.word + "\n" + word.senses[0].glosses[0] + "\n\n";
      fs.appendFileSync(output, entry, "utf8"); //io
    }
  }
}

/**
 * Applies all available text-cleaning filters to a given string.
 *
 * @remarks   This function sequentially applies the following normalization steps:
 * - {@link normalizeUnicode} — removes diacritical marks
 * - {@link removePunctuation} — strips punctuation symbols
 * - {@link removeCommonWords} — removes frequent English stop words
 * - {@link normalizeSpaces} — collapses multiple spaces
 * - {@link lowerCase} — converts to lowercase
 *
 * The filters are applied in the order listed above to ensure consistent, language-agnostic normalization.
 *
 * @param input   The input string to normalize
 *
 * @returns   The fully normalized and cleaned string
 *
 * @see preprocessDict   For the context in which this function is used
 */
function applyFilters(input: string): string {
  return lowerCase(
    normalizeSpaces(
      removeCommonWords(removePunctuation(normalizeUnicode(input)))
    )
  );
}
