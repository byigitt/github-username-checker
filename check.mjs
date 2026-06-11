#!/usr/bin/env node
// Check GitHub username availability via the public API.
//
//   GET https://api.github.com/users/{username}
//     404 -> AVAILABLE
//     200 -> TAKEN
//     other -> UNKNOWN (e.g. rate limited / reserved)
//
// Rate-limit friendly: sleeps between calls and reads X-RateLimit-Remaining.
// Auth: if GITHUB_TOKEN (or GH_TOKEN) is set, uses it for the 5000/hr quota.
//
// Usage:
//   node check.mjs              # reads candidates.json
//   node check.mjs alice bob    # checks given usernames
// Writes results.json + results.md.

import { readFileSync, writeFileSync } from "node:fs";

const SLEEP_MS = Number(process.env.SLEEP_MS ?? 1500);
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadUsernames() {
  const args = process.argv.slice(2);
  if (args.length) return args;
  return JSON.parse(readFileSync("candidates.json", "utf8"));
}

async function checkOne(username) {
  const headers = {
    "User-Agent": "github-username-checker",
    Accept: "application/vnd.github+json",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers,
  });
  const remaining = res.headers.get("x-ratelimit-remaining");

  let status;
  if (res.status === 404) status = "AVAILABLE";
  else if (res.status === 200) status = "TAKEN";
  else if (res.status === 403 || res.status === 429) status = "RATE_LIMITED";
  else status = `UNKNOWN(${res.status})`;

  return { username, status, http: res.status, remaining };
}

async function main() {
  const usernames = loadUsernames();
  console.log(
    `Checking ${usernames.length} usernames (auth: ${TOKEN ? "yes" : "no"}, sleep ${SLEEP_MS}ms)\n`,
  );

  const results = [];
  for (let i = 0; i < usernames.length; i++) {
    const u = usernames[i];
    let r;
    try {
      r = await checkOne(u);
    } catch (e) {
      r = { username: u, status: "ERROR", http: 0, remaining: null, error: String(e) };
    }
    results.push(r);
    const mark = r.status === "AVAILABLE" ? "✅" : r.status === "TAKEN" ? "❌" : "⚠️";
    console.log(
      `${mark} ${u.padEnd(12)} ${r.status.padEnd(13)} (http ${r.http}, remaining ${r.remaining ?? "?"})`,
    );

    // Respect rate limits: back off if running low.
    if (r.remaining !== null && Number(r.remaining) <= 2) {
      console.log("Rate limit nearly exhausted — stopping early.");
      break;
    }
    if (i < usernames.length - 1) await sleep(SLEEP_MS);
  }

  writeFileSync("results.json", JSON.stringify(results, null, 2) + "\n");

  const available = results.filter((r) => r.status === "AVAILABLE").map((r) => r.username);
  const taken = results.filter((r) => r.status === "TAKEN").map((r) => r.username);

  const md = [
    "# Results",
    "",
    `Checked ${results.length} usernames via the GitHub public API.`,
    "",
    "| Username | Status | HTTP |",
    "| --- | --- | --- |",
    ...results.map((r) => `| \`${r.username}\` | ${r.status} | ${r.http} |`),
    "",
    `**Available (${available.length}):** ${available.map((u) => "`" + u + "`").join(", ") || "—"}`,
    "",
    `**Taken (${taken.length}):** ${taken.map((u) => "`" + u + "`").join(", ") || "—"}`,
    "",
  ].join("\n");
  writeFileSync("results.md", md);

  console.log(`\nDone. Available: ${available.length}, Taken: ${taken.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
