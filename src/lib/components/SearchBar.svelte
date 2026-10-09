<script lang="ts">
	import { filters } from '$lib/filters.svelte';
	import { ALL_TYPES, GAMES, TYPE_COLORS, gameName } from '$lib/pokemon';

	let open = $state(false);
	let bar: HTMLDivElement;

	interface Chip {
		key: string;
		label: string;
		value: string;
		dot?: string;
		remove: () => void;
	}

	const chips = $derived.by(() => {
		const out: Chip[] = [];
		if (filters.caught === 'caught') {
			out.push({ key: 'caught', label: 'Caught', value: 'Yes', remove: () => (filters.caught = 'all') });
		}
		if (filters.caught === 'uncaught') {
			out.push({ key: 'caught', label: 'Caught', value: 'No', remove: () => (filters.caught = 'all') });
		}
		if (filters.game) {
			out.push({ key: 'game', label: 'Game', value: gameName(filters.game), remove: () => (filters.game = '') });
		}
		for (const type of filters.types) {
			out.push({
				key: `type:${type}`,
				label: 'Type',
				value: type,
				dot: TYPE_COLORS[type],
				remove: () => filters.toggleType(type)
			});
		}
		return out;
	});

	function pickGame(id: string) {
		filters.game = filters.game === id ? '' : id;
	}

	function onWindowPointerdown(event: PointerEvent) {
		if (open && !bar.contains(event.target as Node)) open = false;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) open = false;
	}
</script>

<svelte:window onpointerdown={onWindowPointerdown} onkeydown={onWindowKeydown} />

<div class="searchbar" class:open bind:this={bar}>
	<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<circle cx="11" cy="11" r="7" />
		<path d="m20 20-3.5-3.5" />
	</svg>

	<input
		type="search"
		placeholder="Search Pokémon…"
		aria-label="Search Pokémon"
		bind:value={filters.query}
	/>

	{#each chips as chip (chip.key)}
		<span class="chip">
			<span class="chip-label">{chip.label}</span>
			{#if chip.dot}
				<span class="dot" style="background: {chip.dot}"></span>
			{/if}
			<span class="chip-value">{chip.value}</span>
			<button
				type="button"
				class="chip-x"
				aria-label="Remove filter {chip.label}: {chip.value}"
				onclick={chip.remove}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		</span>
	{/each}

	<button type="button" class="filters-toggle" aria-expanded={open} onclick={() => (open = !open)}>
		Filters
		<svg class:flip={open} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	{#if open}
		<div class="dropdown">
			<div class="section">
				<span class="section-title">Caught</span>
				<div class="segmented" role="group" aria-label="Caught filter">
					{#each [['all', 'All'], ['caught', 'Caught'], ['uncaught', 'Uncaught']] as [value, label] (value)}
						<button
							type="button"
							class:active={filters.caught === value}
							aria-pressed={filters.caught === value}
							onclick={() => (filters.caught = value as CaughtFilter)}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>

			<div class="section">
				<span class="section-title">Game</span>
				<div class="game-list">
					<button type="button" class="game-row" class:active={filters.game === ''} onclick={() => (filters.game = '')}>
						<span>All games</span>
						{#if filters.game === ''}<span class="check">✓</span>{/if}
					</button>
					{#each GAMES as game (game.id)}
						<button type="button" class="game-row" class:active={filters.game === game.id} onclick={() => pickGame(game.id)}>
							<span>{game.name}</span>
							{#if filters.game === game.id}<span class="check">✓</span>{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="section">
				<span class="section-title">Types</span>
				<div class="type-grid">
					{#each ALL_TYPES as type (type)}
						<button
							type="button"
							class="type-chip"
							class:active={filters.types.has(type)}
							style="--type: {TYPE_COLORS[type] ?? '#9099a1'}"
							aria-pressed={filters.types.has(type)}
							onclick={() => filters.toggleType(type)}
						>
							{type}
						</button>
					{/each}
				</div>
			</div>

			{#if filters.hasActive}
				<button type="button" class="clear-all" onclick={filters.clearAll}>Clear all filters</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.searchbar {
		position: relative;
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 4px 6px 4px 12px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		transition: border-color 120ms ease;
	}

	.searchbar:focus-within,
	.searchbar.open {
		border-color: var(--accent);
	}

	.icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: var(--text-dim);
	}

	input {
		flex: 1;
		min-width: 150px;
		padding: 8px 0;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text);
	}

	input::placeholder {
		color: var(--text-dim);
	}

	/* Active filter facets */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 5px 3px 10px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 13px;
		white-space: nowrap;
	}

	.chip-label {
		color: var(--text-dim);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.chip-value {
		font-weight: 600;
	}

	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
	}

	.chip-x {
		display: grid;
		place-items: center;
		width: 16px;
		height: 16px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 50%;
		color: var(--text-dim);
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease;
	}

	.chip-x:hover {
		background: var(--accent);
		color: #fff;
	}

	.chip-x svg {
		width: 9px;
		height: 9px;
	}

	/* Filters trigger */
	.filters-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--text-dim);
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease;
	}

	.filters-toggle:hover {
		background: var(--card);
		color: var(--text);
	}

	.filters-toggle svg {
		width: 14px;
		height: 14px;
		transition: transform 150ms ease;
	}

	.filters-toggle svg.flip {
		transform: rotate(180deg);
	}

	/* Dropdown */
	.dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 320px;
		max-width: min(420px, calc(100vw - 40px));
		padding: 14px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-dim);
	}

	.segmented {
		display: inline-flex;
		align-self: flex-start;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.segmented button {
		padding: 6px 14px;
		background: transparent;
		border: none;
		border-right: 1px solid var(--border);
		color: var(--text-dim);
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease;
	}

	.segmented button:last-child {
		border-right: none;
	}

	.segmented button:hover {
		color: var(--text);
	}

	.segmented button.active {
		background: var(--accent);
		color: #fff;
	}

	.game-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 240px;
		overflow-y: auto;
	}

	.game-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 10px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--text);
		font-size: 13px;
		text-align: left;
		cursor: pointer;
		transition: background 100ms ease;
	}

	.game-row:hover {
		background: var(--bg-soft);
	}

	.game-row.active {
		background: var(--card-caught);
		color: var(--caught);
		font-weight: 600;
	}

	.check {
		font-size: 12px;
	}

	.type-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.type-chip {
		padding: 4px 10px;
		border: 1px solid var(--border);
		border-radius: 99px;
		background: transparent;
		color: var(--text-dim);
		font-size: 12px;
		font-weight: 600;
		text-transform: capitalize;
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
	}

	.type-chip:hover {
		border-color: var(--type);
		color: var(--text);
	}

	.type-chip.active {
		background: var(--type);
		border-color: var(--type);
		color: #10151f;
	}

	.clear-all {
		align-self: flex-start;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.clear-all:hover {
		border-color: var(--accent);
	}

	@media (max-width: 640px) {
		.dropdown {
			position: fixed;
			top: auto;
			left: 12px;
			right: 12px;
			min-width: 0;
			max-width: none;
		}
	}
</style>
