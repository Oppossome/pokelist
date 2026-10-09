<script lang="ts">
	import { store } from '$lib/caught.svelte';
	import {
		ALL_TYPES,
		GENERATIONS,
		GAMES,
		POKEMON,
		TYPE_COLORS,
		type Pokemon
	} from '$lib/pokemon';
	import PokemonCard from '$lib/components/PokemonCard.svelte';

	let query = $state('');
	let importError = $state('');
	let fileInput = $state<HTMLInputElement>();

	type CaughtFilter = 'all' | 'caught' | 'uncaught';
	let caughtFilter = $state<CaughtFilter>('all');
	let gameFilter = $state('');
	let typeFilter = $state(new Set<string>());

	function toggleType(type: string) {
		const next = new Set(typeFilter);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		typeFilter = next;
	}

	const hasActiveFilters = $derived(
		query.trim() !== '' ||
			caughtFilter !== 'all' ||
			gameFilter !== '' ||
			typeFilter.size > 0
	);

	function clearFilters() {
		query = '';
		caughtFilter = 'all';
		gameFilter = '';
		typeFilter = new Set();
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return POKEMON.filter((p) => {
			if (q && !(p.name.toLowerCase().includes(q) || String(p.id).includes(q))) {
				return false;
			}
			const caught = store.caught.has(p.id);
			if (caughtFilter === 'caught' && !caught) return false;
			if (caughtFilter === 'uncaught' && caught) return false;
			if (gameFilter && !p.games.includes(gameFilter)) return false;
			if (typeFilter.size > 0 && !p.types.some((t) => typeFilter.has(t))) return false;
			return true;
		});
	});

	const grouped = $derived(
		GENERATIONS.map((gen) => ({
			gen,
			pokemon: filtered.filter((p) => p.generation === gen.id)
		})).filter((group) => group.pokemon.length > 0)
	);

	function exportSave() {
		const blob = new Blob([JSON.stringify(store.exportSave(), null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pokevibe-save-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function importSave(event: Event) {
		importError = '';
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const data = JSON.parse(await file.text());
			if (
				store.count > 0 &&
				!confirm(
					`This will replace your current save (${store.count} caught). Continue?`
				)
			) {
				return;
			}
			store.importSave(data);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read that file';
		} finally {
			fileInput.value = '';
		}
	}
</script>

<svelte:head>
	<title>Pokévibe — catch tracker</title>
	<meta name="description" content="Track which Pokémon you've caught, generation by generation." />
</svelte:head>

<div class="page">
	<header>
		<div class="title-row">
			<h1>
				<span class="logo" aria-hidden="true"></span>
				Pokévibe
			</h1>
			<span class="progress">
				{store.count} / {POKEMON.length} caught
			</span>
		</div>

		<div class="toolbar">
			<input
				type="search"
				placeholder="Search by name or dex number…"
				bind:value={query}
				aria-label="Search Pokémon"
			/>
			<div class="actions">
				<button type="button" onclick={exportSave} disabled={store.count === 0}>
					Export
				</button>
				<button type="button" onclick={() => fileInput.click()}>Import</button>
				<input
					type="file"
					accept="application/json,.json"
					hidden
					bind:this={fileInput}
					onchange={importSave}
				/>
			</div>
		</div>

		{#if importError}
			<p class="error" role="alert">{importError}</p>
		{/if}

		<div class="filters">
			<div class="filter-group">
				<span class="filter-label">Caught</span>
				<div class="segmented" role="group" aria-label="Caught filter">
					<button
						type="button"
						class:active={caughtFilter === 'all'}
						aria-pressed={caughtFilter === 'all'}
						onclick={() => (caughtFilter = 'all')}>All</button
					>
					<button
						type="button"
						class:active={caughtFilter === 'caught'}
						aria-pressed={caughtFilter === 'caught'}
						onclick={() => (caughtFilter = 'caught')}>Caught</button
					>
					<button
						type="button"
						class:active={caughtFilter === 'uncaught'}
						aria-pressed={caughtFilter === 'uncaught'}
						onclick={() => (caughtFilter = 'uncaught')}>Uncaught</button
					>
				</div>
			</div>

			<div class="filter-group">
				<label class="filter-label" for="game-filter">Game</label>
				<select id="game-filter" bind:value={gameFilter}>
					<option value="">All games</option>
					{#each GAMES as game (game.id)}
						<option value={game.id}>{game.name}</option>
					{/each}
				</select>
			</div>

			<div class="filter-group">
				<span class="filter-label">Types</span>
				<div class="type-chips">
					{#each ALL_TYPES as type (type)}
						<button
							type="button"
							class="type-chip"
							class:active={typeFilter.has(type)}
							style="--type: {TYPE_COLORS[type] ?? '#9099a1'}"
							aria-pressed={typeFilter.has(type)}
							onclick={() => toggleType(type)}
						>
							{type}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if hasActiveFilters}
			<p class="filter-status">
				{filtered.length} of {POKEMON.length} shown
				<button type="button" class="clear" onclick={clearFilters}>Clear filters</button>
			</p>
		{/if}
	</header>

	<main>
		{#each grouped as { gen, pokemon } (gen.id)}
			<section>
				<h2>
					<span class="gen-name">Gen {gen.id} — {gen.name}</span>
					<span class="gen-count">
						{pokemon.filter((p) => store.caught.has(p.id)).length}/{pokemon.length}
					</span>
				</h2>
				<div class="grid">
					{#each pokemon as mon (mon.id)}
						<PokemonCard
							pokemon={mon}
							caught={store.caught.has(mon.id)}
							onToggle={(id) => store.toggle(id)}
						/>
					{/each}
				</div>
			</section>
		{:else}
			<p class="empty">
				No Pokémon match the current {hasActiveFilters ? 'search and filters' : 'search'}.
				{#if hasActiveFilters}
					<button type="button" class="clear" onclick={clearFilters}>Clear filters</button>
				{/if}
			</p>
		{/each}
	</main>
</div>

<style>
	.page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 24px 20px 60px;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: linear-gradient(to bottom, var(--bg) 75%, transparent);
		padding-bottom: 16px;
	}

	.title-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		font-size: 26px;
		letter-spacing: 0.01em;
	}

	.logo {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 3px solid #1a2338;
		background: linear-gradient(to bottom, var(--accent) 42%, #f5f6fa 42%, #f5f6fa 58%, #2b3550 58%);
		box-shadow: 0 0 0 1px var(--border);
	}

	.progress {
		font-variant-numeric: tabular-nums;
		color: var(--caught);
		font-weight: 600;
		background: var(--card-caught);
		border: 1px solid var(--border);
		padding: 4px 12px;
		border-radius: 99px;
	}

	.toolbar {
		display: flex;
		gap: 10px;
		margin-top: 14px;
		flex-wrap: wrap;
	}

	input[type='search'] {
		flex: 1;
		min-width: 220px;
		padding: 10px 14px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		outline: none;
	}

	input[type='search']:focus {
		border-color: var(--accent);
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.actions button {
		padding: 10px 16px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font-weight: 600;
		transition: border-color 120ms ease;
	}

	.actions button:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.actions button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.error {
		margin: 10px 0 0;
		color: #ff8a80;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 16px 24px;
		align-items: flex-end;
		margin-top: 14px;
		padding: 12px 14px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.filter-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-dim);
	}

	.segmented {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.segmented button {
		padding: 6px 14px;
		background: transparent;
		border: none;
		border-right: 1px solid var(--border);
		cursor: pointer;
		color: var(--text-dim);
		font-weight: 600;
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

	select {
		padding: 6px 12px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		cursor: pointer;
		outline: none;
	}

	select:focus {
		border-color: var(--accent);
	}

	.type-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		max-width: 520px;
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

	.filter-status {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--text-dim);
	}

	.clear {
		padding: 4px 10px;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.clear:hover {
		border-color: var(--accent);
	}

	main section {
		margin-top: 28px;
	}

	h2 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin: 0 0 12px;
		font-size: 18px;
		border-bottom: 1px solid var(--border);
		padding-bottom: 8px;
	}

	.gen-count {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}

	.empty {
		margin-top: 40px;
		text-align: center;
		color: var(--text-dim);
	}

	@media (max-width: 640px) {
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}

		img {
			width: 72px;
			height: 72px;
		}
	}
</style>
