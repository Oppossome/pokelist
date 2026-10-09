import type { Pokemon } from './pokemon';

const ENDPOINT = 'https://beta.pokeapi.co/graphql/v1beta';

const GENERATION_NUMBERS: Record<string, number> = {
	i: 1,
	ii: 2,
	iii: 3,
	iv: 4,
	v: 5,
	vi: 6,
	vii: 7,
	viii: 8,
	ix: 9
};

/** One GraphQL request for every species: names, generation, types, games. */
export const POKEDEX_QUERY = `query {
	pokemon_v2_pokemonspecies(order_by: {id: asc}, limit: 1200) {
		id
		name
		pokemon_v2_generation { name }
		pokemon_v2_pokemons(where: {is_default: {_eq: true}}) {
			pokemon_v2_pokemontypes(order_by: {slot: asc}) {
				slot
				pokemon_v2_type { name }
			}
		}
		pokemon_v2_pokemonspeciesflavortexts(where: {language_id: {_eq: 9}}) {
			pokemon_v2_version { name }
		}
	}
}`;

/** Fold DLC versions ("the-teal-mask-violet") into their base game. */
function normalizeGame(version: string): string {
	return version.replace(/^(the-[\w-]+)-(sword|shield|scarlet|violet)$/, '$2');
}

function capitalize(name: string): string {
	return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface GraphQLSpecies {
	id: number;
	name: string;
	pokemon_v2_generation: { name: string } | null;
	pokemon_v2_pokemons: { pokemon_v2_pokemontypes: { slot: number; pokemon_v2_type: { name: string } }[] }[];
	pokemon_v2_pokemonspeciesflavortexts: { pokemon_v2_version: { name: string } }[];
}

interface GraphQLResponse {
	data?: { pokemon_v2_pokemonspecies: GraphQLSpecies[] };
	errors?: { message: string }[];
}

export async function fetchPokedex(): Promise<Pokemon[]> {
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ query: POKEDEX_QUERY })
	});
	if (!res.ok) throw new Error(`PokéAPI responded ${res.status}`);
	const json = (await res.json()) as GraphQLResponse;
	if (json.errors?.length) throw new Error(json.errors[0].message);

	const species = json.data?.pokemon_v2_pokemonspecies;
	if (!species || species.length === 0) {
		throw new Error('PokéAPI returned no species');
	}

	return species.map((s): Pokemon => ({
		id: s.id,
		name: capitalize(s.name),
		generation:
			GENERATION_NUMBERS[
				(s.pokemon_v2_generation?.name ?? '').replace('generation-', '')
			] ?? 0,
		types: (s.pokemon_v2_pokemons[0]?.pokemon_v2_pokemontypes ?? [])
			.slice()
			.sort((a, b) => a.slot - b.slot)
			.map((t) => t.pokemon_v2_type.name),
		games: [
			...new Set(
				s.pokemon_v2_pokemonspeciesflavortexts.map((f) =>
					normalizeGame(f.pokemon_v2_version.name)
				)
			)
		]
	}));
}
