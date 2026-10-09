export type CaughtFilter = 'all' | 'caught' | 'uncaught';

class FilterStore {
	query = $state('');
	caught = $state<CaughtFilter>('all');
	game = $state('');
	types = $state<ReadonlySet<string>>(new Set());

	get hasActive(): boolean {
		return (
			this.query.trim() !== '' ||
			this.caught !== 'all' ||
			this.game !== '' ||
			this.types.size > 0
		);
	}

	/** Add or remove one type. */
	toggleType(type: string) {
		const next = new Set(this.types);
		if (!next.delete(type)) next.add(type);
		this.types = next;
	}

	clearAll() {
		this.query = '';
		this.caught = 'all';
		this.game = '';
		this.types = new Set();
	}
}

export const filters = new FilterStore();
