# Pokelist

A small SvelteKit PWA Pokédex catch tracker: all Pokémon grouped by generation,
with a search/facet bar, click-to-mark-as-caught, and save data in
localStorage.

> **Disclaimer:** this is a vibecoded project I made for my wife. While I have
> read the code, I make no guarantees about anything — use at your own risk and
> export your save now and then.

## Data flow

- **Live data** comes from the [PokeAPI GraphQL beta
  endpoint](https://beta.pokeapi.co/graphql/v1beta) in a single request (names,
  generations, types, and per-game Pokédex entries) via **TanStack Query**
  (`@tanstack/svelte-query`). Data is considered fresh for 24 hours; the query
  cache is persisted to localStorage (`pokelist:query-cache`) so a PWA launch
  offline uses the last synced data for up to a week.
- **Offline snapshot**: `src/lib/data/pokemon.json` (a commit-time copy of the
  CSV dataset) is used to prerender the grid at build time and as a fallback
  when the API can't be reached. Regenerate it from the live GraphQL endpoint
  or the [PokeAPI CSV
  dataset](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) if it
  ever needs refreshing.

- **Sprites** load lazily from the [PokeAPI sprites
  repo](https://github.com/PokeAPI/sprites) and are cached by the service
  worker (CacheFirst, 180 days).

Caught data never leaves your browser — it lives in `localStorage` under
`pokelist:save:v1`. Use **Export** to download it as JSON and **Import** to restore
it (validated with zod) on this or another device.

## PWA

`@vite-pwa/sveltekit` generates `sw.js` (Workbox, autoUpdate): the app shell is
precached, sprites use CacheFirst runtime caching. The GraphQL endpoint is
POST-only (not cacheable by the Cache API), so offline data resilience comes
from the TanStack query persister instead.

## Running

This machine is NixOS, so run commands through the project shell:

```sh
nix-shell --run "npm run dev"
```

Then open http://localhost:5173. Service worker registration is skipped in dev
unless you enable it.

Production build (static site in `build/`):

```sh
nix-shell --run "npm run build"
nix-shell --run "npm run preview"
```

Type checking:

```sh
nix-shell --run "npm run check"
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`
(run `svelte-check` → build with `BASE_PATH=/<repo-name>` → deploy). To
activate: create the GitHub repo, push, then set **Settings → Pages → Source**
to **GitHub Actions**. Local builds ignore the base path, so `npm run dev` and
`npm run preview` work unchanged.
