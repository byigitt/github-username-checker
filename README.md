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

## Status

🚧 Work in progress (built incrementally via a Ralph loop).
