import { browser } from '$app/environment';
import { z } from 'zod';

const STORAGE_KEY = 'pokelist:settings:v1';

export const settingsSchema = z.object({
	cardSize: z.number().int().min(80).max(260)
});

export type AppSettings = z.infer<typeof settingsSchema>;

const DEFAULTS: AppSettings = { cardSize: 150 };

class SettingsStore {
	cardSize = $state(DEFAULTS.cardSize);

	constructor() {
		if (browser) {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw) {
					const parsed = settingsSchema.safeParse(JSON.parse(raw));
					if (parsed.success) {
						this.cardSize = parsed.data.cardSize;
					}
				}
			} catch {
				// Corrupted settings — keep defaults.
			}
		}
	}

	setCardSize(value: number) {
		this.cardSize = Math.min(260, Math.max(80, Math.round(value)));
		this.#persist();
	}

	#persist() {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsSchema.parse({ cardSize: this.cardSize })));
	}
}

export const settings = new SettingsStore();