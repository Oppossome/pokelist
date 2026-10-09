import { browser } from '$app/environment';
import { z } from 'zod';

const STORAGE_KEY = 'pokelist:save:v1';
// Renamed from "pokevibe" — legacy saves migrate to the new key on load.
const LEGACY_STORAGE_KEY = 'pokevibe:save:v1';

// 'pokevibe' still accepted so saves exported before the rename import fine.
export const saveDataSchema = z.object({
	app: z.union([z.literal('pokelist'), z.literal('pokevibe')], {
		error: 'Not a Pokelist save file'
	}),
	version: z.number().int().positive(),
	caught: z.array(z.number().int().positive(), { error: 'Save file has no caught list' }),
	exportedAt: z.string().datetime().optional()
});

export type SaveData = z.infer<typeof saveDataSchema>;

function sanitize(ids: unknown): number[] {
	if (!Array.isArray(ids)) return [];
	return [...new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0))];
}

class CaughtStore {
	#caught = $state<Set<number>>(new Set());

	constructor() {
		if (browser) {
			try {
				const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
				if (raw) this.#caught = new Set(sanitize(JSON.parse(raw).caught));
			} catch {
				// Corrupted save — start fresh rather than crash.
			}
		}
	}

	get caught(): ReadonlySet<number> {
		return this.#caught;
	}

	get count(): number {
		return this.#caught.size;
	}

	toggle(id: number) {
		const next = new Set(this.#caught);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		this.#caught = next;
		this.#persist();
	}

	exportSave(): SaveData {
		return {
			app: 'pokelist',
			version: 1,
			caught: [...this.#caught].sort((a, b) => a - b),
			exportedAt: new Date().toISOString()
		};
	}

	/** Replace the current save with the given one. Throws when the data is invalid. */
	importSave(data: unknown) {
		const parsed = saveDataSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(parsed.error.issues[0]?.message ?? 'Invalid save file');
		}
		this.#caught = new Set(parsed.data.caught);
		this.#persist();
	}

	#persist() {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.exportSave()));
		// Migration: don't leave the old key holding stale data.
		localStorage.removeItem(LEGACY_STORAGE_KEY);
	}
}

export const store = new CaughtStore();