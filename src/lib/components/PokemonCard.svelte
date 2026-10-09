<script lang="ts">
	import { settings } from '$lib/settings.svelte';
	import type { Pokemon } from '$lib/pokemon';
	import Pokeball from '$lib/components/Pokeball.svelte';
	import {
		homeSprite,
		fallbackSprite,
		TYPE_COLORS
	} from '$lib/pokemon';

	let {
		pokemon,
		caught,
		onToggle
	}: {
		pokemon: Pokemon;
		caught: boolean;
		onToggle: (id: number) => void;
	} = $props();

	let failed = $state(false);

	// Falls back to the classic sprite style if the HOME sprite is missing.
	const sprite = $derived(failed ? fallbackSprite(pokemon.id) : homeSprite(pokemon.id));

	function retryFallback() {
		failed = true;
	}
</script>

<button
	type="button"
	class="card"
	class:caught
	aria-pressed={caught}
	title={caught ? `${pokemon.name} — caught` : `${pokemon.name} — click to mark as caught`}
	onclick={() => onToggle(pokemon.id)}
>
	<span class="pokeball" class:caught aria-hidden="true"><Pokeball /></span>
	<img src={sprite} alt="" loading="lazy" width="96" height="96" onerror={retryFallback} />
	<span class="dex">#{String(pokemon.id).padStart(4, '0')}</span>
	<span class="name">{pokemon.name}</span>
	{#if settings.showTypes}
		<span class="types">
			{#each pokemon.types as type (type)}
				<span class="chip" style="--type: {TYPE_COLORS[type] ?? '#9099a1'}">{type}</span>
			{/each}
		</span>
	{/if}
</button>

<style>
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 14px 10px 12px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		user-select: none;
		transition:
			transform 120ms ease,
			border-color 120ms ease,
			background 120ms ease;
	}

	.card:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
	}

	.card.caught {
		background: var(--card-caught);
		border-color: var(--caught);
	}

	.pokeball {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 14px;
		height: 14px;
		display: block;
		opacity: 0.25;
		transition: opacity 120ms ease;
	}

	.pokeball.caught {
		opacity: 1;
	}

	img {
		/* Scales with the --card-size variable set by the settings modal. */
		width: calc(var(--card-size, 150px) * 0.62);
		height: calc(var(--card-size, 150px) * 0.62);
		object-fit: contain;
		filter: grayscale(0.6) opacity(0.75);
		transition: filter 120ms ease;
	}

	.card.caught img,
	.card:hover img {
		filter: none;
	}

	.dex {
		font-size: 11px;
		color: var(--text-dim);
		letter-spacing: 0.04em;
	}

	.name {
		/* Scale down with small cards; break long names rather than overflow. */
		font-size: clamp(9px, calc(var(--card-size, 150px) * 0.093), 14px);
		font-weight: 600;
		text-transform: capitalize;
		text-align: center;
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.types {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px;
		min-height: 18px;
		max-width: 100%;
	}

	.chip {
		font-size: clamp(8px, calc(var(--card-size, 150px) * 0.067), 10px);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #10151f;
		background: var(--type);
		padding: 2px calc(var(--card-size, 150px) * 0.045);
		border-radius: 99px;
		white-space: nowrap;
	}
</style>
