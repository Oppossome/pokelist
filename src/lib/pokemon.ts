export interface Pokemon {
	id: number;
	name: string;
	generation: number;
	types: string[];
	games: string[];
}

/** Region names for generations 1-9; later generations fall back to "Gen N". */
export const GENERATIONS = [
	{ id: 1, name: 'Kanto' },
	{ id: 2, name: 'Johto' },
	{ id: 3, name: 'Hoenn' },
	{ id: 4, name: 'Sinnoh' },
	{ id: 5, name: 'Unova' },
	{ id: 6, name: 'Kalos' },
	{ id: 7, name: 'Alola' },
	{ id: 8, name: 'Galar' },
	{ id: 9, name: 'Paldea' }
] as const;

/** Release order for game labels in the filter dropdown. */
const GAME_ORDER = [
	'red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'ruby', 'sapphire',
	'emerald', 'firered', 'leafgreen', 'diamond', 'pearl', 'platinum',
	'heartgold', 'soulsilver', 'black', 'white', 'black-2', 'white-2',
	'x', 'y', 'omega-ruby', 'alpha-sapphire', 'sun', 'moon', 'ultra-sun',
	'ultra-moon', 'lets-go-pikachu', 'lets-go-eevee', 'sword', 'shield',
	'legends-arceus', 'scarlet', 'violet'
];

/** Friendly display name for a game identifier. */
export function gameName(game: string): string {
	const labels: Record<string, string> = {
		'firered': 'FireRed',
		'leafgreen': 'LeafGreen',
		'heartgold': 'HeartGold',
		'soulsilver': 'SoulSilver',
		'lets-go-pikachu': "Let's Go Pikachu",
		'lets-go-eevee': "Let's Go Eevee",
		'legends-arceus': 'Legends: Arceus'
	};
	if (labels[game]) return labels[game];
	return game
		.split('-')
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
}

/** Every game present in the data, in release order. Unknown games go last. */
export function gamesIn(pokemon: Pokemon[]): { id: string; name: string }[] {
	const present = new Set<string>();
	for (const p of pokemon) for (const g of p.games) present.add(g);
	return [...present]
		.map((id) => ({ id, index: GAME_ORDER.indexOf(id) }))
		.sort((a, b) => {
			const ai = a.index === -1 ? GAME_ORDER.length : a.index;
			const bi = b.index === -1 ? GAME_ORDER.length : b.index;
			return ai - bi || a.id.localeCompare(b.id);
		})
		.map((g) => ({ id: g.id, name: gameName(g.id) }));
}

/** The 18 stable types for filter chips. */
export const ALL_TYPES = [
	'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting',
	'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',
	'dragon', 'dark', 'steel', 'fairy'
];

export const TYPE_COLORS: Record<string, string> = {
	normal: '#9099a1',
	fire: '#ff9d55',
	water: '#4d90d5',
	electric: '#f4d23c',
	grass: '#63bc5a',
	ice: '#7fccec',
	fighting: '#ce4069',
	poison: '#ab6ac8',
	ground: '#d97845',
	flying: '#8fa8de',
	psychic: '#f97176',
	bug: '#90c12c',
	rock: '#c7b78b',
	ghost: '#5269ac',
	dragon: '#0a6dc4',
	dark: '#5a5366',
	steel: '#5a8ea1',
	fairy: '#ec8fe6'
};

export function homeSprite(id: number): string {
	return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
}

export function fallbackSprite(id: number): string {
	return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}
