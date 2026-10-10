import { browser } from '$app/environment';
import { z } from 'zod';

const STORAGE_KEY = 'pokelist:settings:v1';

export const settingsSchema = z.object({
	cardSize: z.number().int().min(80).max(260),
	// .default(...) keeps older stored settings (without these keys) valid.
	showTypes: z.boolean().default(true),
	groupBy: z.enum(['generation', 'none']).default('generation')
});

export type AppSettings = z.infer<typeof settingsSchema>;

const DEFAULTS: AppSettings = { cardSize: 150, showTypes: true, groupBy: 'generation' };

class SettingsStore {
	cardSize = $state(DEFAULTS.cardSize);
	showTypes = $state(DEFAULTS.showTypes);
	groupBy = $state<AppSettings['groupBy']>(DEFAULTS.groupBy);

	constructor() {
		if (browser) {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw) {
					const parsed = settingsSchema.safeParse(JSON.parse(raw));
					if (parsed.success) {
						this.cardSize = parsed.data.cardSize;
						this.showTypes = parsed.data.showTypes;
						this.groupBy = parsed.data.groupBy;
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

	toggleTypes() {
		this.showTypes = !this.showTypes;
		this.#persist();
	}

	setGroupBy(value: AppSettings['groupBy']) {
		this.groupBy = value;
		this.#persist();
	}

	#persist() {
		if (!browser) return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(
				settingsSchema.parse({ cardSize: this.cardSize, showTypes: this.showTypes, groupBy: this.groupBy })
			)
		);
	}
}

export const settings = new SettingsStore();