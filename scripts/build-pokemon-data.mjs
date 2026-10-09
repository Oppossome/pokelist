/**
 * Builds src/lib/data/pokemon.json from the PokeAPI CSV dataset.
 *
 * Sources (same data the PokeAPI serves):
 *   - pokemon_species.csv         : national dex ids, names, generation ids
 *   - pokemon.csv                 : maps species id -> default form id
 *   - pokemon_types.csv           : type slots per form
 *   - types.csv                   : type names
 *   - pokemon_species_flavor_text.csv : which games each species has a
 *     Pokédex entry in (proxy for availability; English entries only)
 *   - versions.csv                : version ids and identifiers
 *
 * Run with: npm run build:data
 */
import { mkdir, writeFile } from 'node:fs/promises';

const BASE =
	'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';

async function fetchCsv(name) {
	const res = await fetch(`${BASE}/${name}`);
	if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
	return res.text();
}

const ENGLISH = '9';

/** Fold DLC versions ("the-teal-mask-violet") into their base game. */
function normalizeGame(identifier) {
	return identifier.replace(/^(the-[\w-]+)-(sword|shield|scarlet|violet)$/, '$2');
}

function parseCsv(text) {
	const lines = text.trim().split('\n');
	const headers = lines[0].split(',');
	return lines.slice(1).map((line) => {
		const values = [];
		let current = '';
		let quoted = false;
		for (const char of line) {
			if (char === '"') quoted = !quoted;
			else if (char === ',' && !quoted) {
				values.push(current);
				current = '';
			} else current += char;
		}
		values.push(current);
		return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
	});
}

const [speciesCsv, pokemonCsv, pokemonTypesCsv, typesCsv, flavorCsv, versionsCsv] =
	await Promise.all([
		fetchCsv('pokemon_species.csv'),
		fetchCsv('pokemon.csv'),
		fetchCsv('pokemon_types.csv'),
		fetchCsv('types.csv'),
		fetchCsv('pokemon_species_flavor_text.csv'),
		fetchCsv('versions.csv')
	]);

const versionIdentifier = new Map(
	parseCsv(versionsCsv).map((row) => [Number(row.id), row.identifier])
);

// Species id -> version id -> normalized game identifier
const gamesBySpecies = new Map();
for (const row of parseCsv(flavorCsv)) {
	if (row.language_id !== ENGLISH) continue;
	const speciesId = Number(row.species_id);
	const versionId = Number(row.version_id);
	const game = normalizeGame(versionIdentifier.get(versionId));
	if (!game) continue;
	const byVersion = gamesBySpecies.get(speciesId) ?? new Map();
	// Keep the earliest version id per game so games can be ordered by release.
	if (!byVersion.has(game) || byVersion.get(game) > versionId) {
		byVersion.set(game, versionId);
	}
	gamesBySpecies.set(speciesId, byVersion);
}

const typeNames = new Map(
	parseCsv(typesCsv).map((row) => [Number(row.id), row.identifier])
);

// Species id -> default form id (the form shown in the Pokédex)
const defaultFormBySpecies = new Map(
	parseCsv(pokemonCsv)
		.filter((row) => row.is_default === '1')
		.map((row) => [Number(row.species_id), Number(row.id)])
);

// Form id -> [{ slot, type }]
const typesByForm = new Map();
for (const row of parseCsv(pokemonTypesCsv)) {
	const id = Number(row.pokemon_id);
	const slots = typesByForm.get(id) ?? [];
	slots.push({ slot: Number(row.slot), type: typeNames.get(Number(row.type_id)) });
	typesByForm.set(id, slots);
}

const pokemon = parseCsv(speciesCsv)
	.map((row) => {
		const id = Number(row.id);
		const slots = (typesByForm.get(defaultFormBySpecies.get(id)) ?? []).sort(
			(a, b) => a.slot - b.slot
		);
		const games = [...(gamesBySpecies.get(id) ?? new Map())]
			.sort(([, a], [, b]) => a - b)
			.map(([game]) => game);
		return {
			id,
			name: row.identifier.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			generation: Number(row.generation_id),
			types: slots.map((s) => s.type),
			games
		};
	})
	.sort((a, b) => a.id - b.id);

const missingTypes = pokemon.filter((p) => p.types.length === 0);
if (missingTypes.length > 0) {
	throw new Error(`Missing types for ${missingTypes.length} species`);
}

const noGames = pokemon.filter((p) => p.games.length === 0);
if (noGames.length > 0) {
	console.warn(`No games for ${noGames.length} species:`, noGames.map((p) => p.id).join(','));
}

await mkdir(new URL('../src/lib/data', import.meta.url), { recursive: true });
await writeFile(
	new URL('../src/lib/data/pokemon.json', import.meta.url),
	JSON.stringify(pokemon)
);

console.log(`Wrote ${pokemon.length} pokemon`);
