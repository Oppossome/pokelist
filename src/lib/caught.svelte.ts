import { browser } from '$app/environment';
import { z } from 'zod';

const STORAGE_KEY = 'pokelist:saves:v1';

/** The pre-slots key: a bare caught list. Adopted once, into the first slot. */
const LEGACY_STORAGE_KEY = 'pokelist:save:v1';

export const MAX_SLOTS = 20;
export const MAX_SLOT_NAME = 40;

export const slotNameSchema = z
	.string()
	.trim()
	.min(1, { error: 'Give the save a name' })
	.max(MAX_SLOT_NAME, { error: `Keep names under ${MAX_SLOT_NAME} characters` });

export const saveSlotSchema = z.object({
	id: z.string().min(1),
	name: slotNameSchema,
	caught: z.array(z.number().int().positive())
});

export type SaveSlot = z.infer<typeof saveSlotSchema>;

export const savesSchema = z
	.object({
		version: z.literal(1),
		activeId: z.string(),
		// At least one slot always exists, so the active save is never empty.
		slots: z.array(saveSlotSchema).min(1)
	})
	// `activeId` is only meaningful while it points at a stored slot.
	.transform((data) => ({
		...data,
		activeId: data.slots.some((slot) => slot.id === data.activeId)
			? data.activeId
			: data.slots[0].id
	}));

export type SavesData = z.infer<typeof savesSchema>;

/** A single exported file — one slot's catches, whichever is active. */
export const saveDataSchema = z.object({
	app: z.literal('pokelist', { error: 'Not a Pokelist save file' }),
	version: z.number().int().positive(),
	caught: z.array(z.number().int().positive(), { error: 'Save file has no caught list' }),
	exportedAt: z.string().datetime().optional()
});

export type SaveData = z.infer<typeof saveDataSchema>;

function sanitize(ids: unknown): number[] {
	if (!Array.isArray(ids)) return [];
	return [...new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0))].sort(
		(a, b) => a - b
	);
}

function newSlot(name: string, caught: number[] = []): SaveSlot {
	return { id: crypto.randomUUID(), name, caught: sanitize(caught) };
}

class CaughtStore {
	#slots = $state([newSlot('My save')]);
	#activeId = $state('');

	// Memoized because the grid reads `caught` once per Pokémon while filtering.
	#active = $derived(this.#slots.find((slot) => slot.id === this.#activeId) ?? this.#slots[0]);
	#caught = $derived(new Set(this.#active.caught));

	constructor() {
		// SSR runs this on the server and again in the browser, so the id
		// generated above differs between the two — resolve it on load.
		this.#activeId = this.#slots[0].id;
		if (browser) {
			const stored = this.#load();
			if (stored) {
				this.#slots = stored.slots;
				this.#activeId = stored.activeId;
			} else if (this.#adoptLegacySave()) {
				this.#persist();
			}
		}
	}

	get slots(): SaveSlot[] {
		return this.#slots;
	}

	get activeId(): string {
		return this.#activeId;
	}

	get active(): SaveSlot {
		return this.#active;
	}

	get caught(): ReadonlySet<number> {
		return this.#caught;
	}

	get count(): number {
		return this.#caught.size;
	}

	toggle(id: number) {
		const slot = this.#active;
		const caught = slot.caught.includes(id)
			? slot.caught.filter((caughtId) => caughtId !== id)
			: sanitize([...slot.caught, id]);
		this.#replace(slot.id, caught);
	}

	/** Point the active save at a different slot. Unknown ids are ignored. */
	selectSlot(id: string) {
		if (id === this.#activeId || !this.#slots.some((slot) => slot.id === id)) return;
		this.#activeId = id;
		this.#persist();
	}

	/** Start an empty save, named after the given name or "My save N". */
	createSlot(name?: string) {
		if (this.#slots.length >= MAX_SLOTS) return;
		const slot = newSlot(name?.trim() || `My save ${this.#slots.length + 1}`);
		this.#slots = [...this.#slots, slot];
		this.#activeId = slot.id;
		this.#persist();
	}

	/** Copy a slot's catches into a new save next to it. Unknown ids are ignored. */
	duplicateSlot(id: string) {
		if (this.#slots.length >= MAX_SLOTS) return;
		const source = this.#slots.find((slot) => slot.id === id);
		if (!source) return;
		const copy = newSlot(`${source.name} copy`, source.caught);
		const at = this.#slots.indexOf(source) + 1;
		this.#slots = [...this.#slots.slice(0, at), copy, ...this.#slots.slice(at)];
		this.#activeId = copy.id;
		this.#persist();
	}

	renameSlot(id: string, name: string) {
		const parsed = slotNameSchema.safeParse(name);
		if (!parsed.success) {
			throw new Error(parsed.error.issues[0]?.message ?? 'Invalid name');
		}
		this.#slots = this.#slots.map((slot) =>
			slot.id === id ? { ...slot, name: parsed.data } : slot
		);
		this.#persist();
	}

	/** Delete a save. The last remaining one is never removed. */
	deleteSlot(id: string) {
		if (this.#slots.length < 2) return;
		const remaining = this.#slots.filter((slot) => slot.id !== id);
		if (remaining.length === this.#slots.length) return;
		this.#slots = remaining;
		if (this.#activeId === id) this.#activeId = remaining[0].id;
		this.#persist();
	}

	/** A save file for one slot — the active save unless an id is given. */
	exportSave(id: string = this.#activeId): SaveData {
		const slot = this.#slots.find((candidate) => candidate.id === id);
		if (!slot) throw new Error('That save no longer exists');
		return {
			app: 'pokelist',
			version: 1,
			caught: [...slot.caught],
			exportedAt: new Date().toISOString()
		};
	}

	/** Replace the active save's catches with the given ones. Throws when invalid. */
	importSave(data: unknown) {
		const parsed = saveDataSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(parsed.error.issues[0]?.message ?? 'Invalid save file');
		}
		this.#replace(this.#active.id, parsed.data.caught);
	}

	#replace(id: string, caught: number[]) {
		const clean = sanitize(caught);
		this.#slots = this.#slots.map((slot) => (slot.id === id ? { ...slot, caught: clean } : slot));
		this.#persist();
	}

	#load(): SavesData | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			const parsed = savesSchema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : null;
		} catch {
			// Corrupted saves — fall through to the legacy key.
			return null;
		}
	}

	/** Pull a pre-slots `pokelist:save:v1` caught list into the first slot. */
	#adoptLegacySave(): boolean {
		try {
			const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
			if (!raw) return false;
			const caught = sanitize(JSON.parse(raw).caught);
			if (caught.length === 0) return false;
			this.#slots = [{ ...this.#slots[0], caught }];
			return true;
		} catch {
			return false;
		}
	}

	#persist() {
		if (!browser) return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(
				savesSchema.parse({ version: 1, activeId: this.#activeId, slots: this.#slots })
			)
		);
	}
}

export const store = new CaughtStore();
