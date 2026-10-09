# Pokévibe

A small SvelteKit Pokédex catch tracker: all 1025 Pokémon grouped by generation,
with a search bar, click-to-mark-as-caught, and save data in localStorage.

Caught data never leaves your browser — it lives in `localStorage` under the key
`pokevibe:save:v1`. Use the **Export** button to download it as JSON and
**Import** to restore it (on this or another device).

## Running

This machine is NixOS, so run commands through the project shell:

```sh
nix-shell --run "npm run dev"
```

Then open http://localhost:5173.

Production build (static site in `build/`):

```sh
nix-shell --run "npm run build"
nix-shell --run "npm run preview"
```

## Pokémon data

`src/lib/data/pokemon.json` is generated from the
[PokeAPI CSV dataset](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv)
(national dex ids, names, generations, and type assignments of each species'
default form). To refresh it:

```sh
nix-shell --run "npm run build:data"
```

Sprites are loaded lazily from the
[PokeAPI sprites](https://github.com/PokeAPI/sprites) repository.
