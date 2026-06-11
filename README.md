# github-username-checker

Check **GitHub username availability** using the public GitHub API, plus a generator
that mines short / rare candidate usernames from a frequency-ordered English wordlist.

## How it works

GitHub's public API exposes:

```
GET https://api.github.com/users/{username}
  → 404 Not Found  = username is AVAILABLE
  → 200 OK         = username is TAKEN
```

We use this to probe candidate usernames. Requests are paced to respect
[rate limits](https://docs.github.com/en/rest/rate-limit) (60/hr unauthenticated,
5000/hr authenticated).

## Wordlist source

Candidates are derived from
[first20hours/google-10000-english](https://github.com/first20hours/google-10000-english)
— the 10,000 most common English words in frequency order.

## Usage

```bash
# 1. Generate rare candidates  ->  candidates.json
#    args: [count] [minLen] [maxLen]
node generate-candidates.mjs 10 3 6

# 2. Check availability  ->  results.json + results.md
#    Uses GITHUB_TOKEN for the 5000/hr quota if present.
GITHUB_TOKEN="$(gh auth token)" node check.mjs

# Or check specific handles directly:
node check.mjs alice some-rare-handle
```

### Rate limiting

- Default `SLEEP_MS=1500` between calls (override via env).
- Reads `X-RateLimit-Remaining` and stops early when ≤ 2 left.
- Unauthenticated: 60/hr. With `GITHUB_TOKEN`: 5000/hr.

### Persistent cache

Conclusive results (`TAKEN` / `AVAILABLE`) are saved to `checked.json` and
skipped on later runs — so we never burn API quota re-checking the same handle.
Transient outcomes (rate-limited / errors) are **not** cached and get retried.
Use `--force` to ignore the cache and re-check everything.

## Latest results

Last run checked 10 rare candidates derived from the frequency tail of the
wordlist — **all 10 were already taken** (short dictionary words go fast on
GitHub). See [`results.md`](./results.md). The checker's AVAILABLE (404) path is
verified against unused random handles.

## Files

| File | Purpose |
| --- | --- |
| `generate-candidates.mjs` | Mine short/rare candidates from the wordlist |
| `check.mjs` | Probe availability via the GitHub API (rate-limit aware) |
| `candidates.json` | Generated candidate usernames |
| `checked.json` | Persistent cache of known results (skips re-checks) |
| `results.json` / `results.md` | Check output |
