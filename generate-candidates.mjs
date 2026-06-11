#!/usr/bin/env node
// Fetch a frequency-ordered English wordlist and derive "rare" username candidates.
//
// Source: first20hours/google-10000-english (10k words, ordered by frequency).
// Rare-ish candidates = short words that are LEAST common (tail of the list),
// since short + uncommon words make the most desirable/plausible GitHub handles.
//
// Usage:
//   node generate-candidates.mjs [count] [minLen] [maxLen]
// Writes candidates.json (array of usernames).

import { writeFileSync } from "node:fs";

const WORDLIST_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt";

const count = Number(process.argv[2] ?? 10);
const minLen = Number(process.argv[3] ?? 3);
const maxLen = Number(process.argv[4] ?? 6);

async function main() {
  console.log(`Fetching wordlist: ${WORDLIST_URL}`);
  const res = await fetch(WORDLIST_URL);
  if (!res.ok) throw new Error(`Wordlist fetch failed: ${res.status}`);
  const text = await res.text();

  // Keep original frequency order (index = rank). Filter by length + valid handle chars.
  const words = text
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  const candidates = words.filter(
    (w) => w.length >= minLen && w.length <= maxLen && /^[a-z][a-z0-9]*$/.test(w),
  );

  // "Rare" = tail of frequency list (least common among the 10k). Take the last N.
  const rare = candidates.slice(-count);

  writeFileSync("candidates.json", JSON.stringify(rare, null, 2) + "\n");
  console.log(
    `Selected ${rare.length} rare candidates (len ${minLen}-${maxLen}):\n  ${rare.join(", ")}`,
  );
  console.log("Wrote candidates.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
