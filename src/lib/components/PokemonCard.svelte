<script lang="ts">
	import type { Pokemon } from '$lib/pokemon';
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

	let sprite = $state(homeSprite(pokemon.id));

	function retryFallback() {
		if (sprite !== fallbackSprite(pokemon.id)) sprite = fallbackSprite(pokemon.id);
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
	<span class="pokeball" aria-hidden="true"></span>
	<img src={sprite} alt="" loading="lazy" width="96" height="96" onerror={retryFallback} />
	<span class="dex">#{String(pokemon.id).padStart(4, '0')}</span>
	<span class="name">{pokemon.name}</span>
	<span class="types">
		{#each pokemon.types as type (type)}
			<span class="chip" style="--type: {TYPE_COLORS[type] ?? '#9099a1'}">{type}</span>
		{/each}
	</span>
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
		border-radius: 50%;
		border: 2px solid var(--border);
		background: linear-gradient(to bottom, var(--accent) 42%, #f5f6fa 42%, #f5f6fa 58%, #2b3550 58%);
		opacity: 0.25;
		transition: opacity 120ms ease;
	}

	.card.caught .pokeball {
		opacity: 1;
		border-color: var(--caught);
	}

	img {
		width: 96px;
		height: 96px;
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
		font-size: 14px;
		font-weight: 600;
		text-transform: capitalize;
	}

	.types {
		display: flex;
		gap: 4px;
		min-height: 18px;
	}

	.chip {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #10151f;
		background: var(--type);
		padding: 2px 7px;
		border-radius: 99px;
	}
</style>
