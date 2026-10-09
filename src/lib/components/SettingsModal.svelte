<script lang="ts">
	import { LayoutGrid, Save, X } from '@lucide/svelte';
	import { store } from '$lib/caught.svelte';
	import { settings } from '$lib/settings.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	// Fresh copy each time the modal opens, saved back on every change.
	let size = $state(0);
	$effect(() => {
		if (open) size = settings.cardSize;
	});

	let importError = $state('');
	let fileInput = $state<HTMLInputElement>();

	function exportSave() {
		const blob = new Blob([JSON.stringify(store.exportSave(), null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pokelist-save-${new Date().toISOString().slice(0, 10)}.json`;
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
			if (fileInput) fileInput.value = '';
		}
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) open = false;
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) open = false;
	}

	function autofocus(el: HTMLElement) {
		el.focus();
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if open}
	<div
		class="overlay"
		role="presentation"
		onclick={onBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && (open = false)}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
			<header>
				<h2 id="settings-title">Settings</h2>
				<button type="button" class="close" aria-label="Close settings" onclick={() => (open = false)}>
					<X size={12} strokeWidth={2.5} aria-hidden="true" />
				</button>
			</header>

			<section class="section">
				<div class="section-head">
					<span class="section-icon" aria-hidden="true">
						<LayoutGrid size={14} strokeWidth={2} />
					</span>
					<h3>Card size</h3>
					<span class="value">{size}px</span>
				</div>
				<p class="desc">How large the Pokémon cards render in the grid.</p>
				<input
					id="card-size"
					type="range"
					min="90"
					max="220"
					step="5"
					aria-label="Card size in pixels"
					bind:value={size}
					oninput={() => settings.setCardSize(size)}
					use:autofocus
				/>
			</section>

			<section class="section">
				<div class="section-head">
					<span class="section-icon" aria-hidden="true">
						<Save size={14} strokeWidth={2} />
					</span>
					<h3>Save data</h3>
				</div>
				<p class="desc">
					Your catches are stored only in this browser. Export a backup, or move
					it to another device.
				</p>
				<div class="save-actions">
					<button type="button" onclick={exportSave} disabled={store.count === 0}>
						Export save
					</button>
					<button type="button" onclick={() => fileInput?.click()}>Import save</button>
					<input
						type="file"
						accept="application/json,.json"
						hidden
						bind:this={fileInput}
						onchange={importSave}
					/>
				</div>
				{#if importError}
					<p class="error" role="alert">{importError}</p>
				{/if}
			</section>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 20px;
		background: rgba(5, 8, 14, 0.6);
		backdrop-filter: blur(2px);
	}

	.modal {
		width: min(440px, 100%);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
		animation: modal-in 160ms ease;
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}

		to {
			opacity: 1;
			transform: none;
		}
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		border-bottom: 1px solid var(--border);
	}

	h2 {
		margin: 0;
		font-size: 17px;
	}

	.close {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text-dim);
		cursor: pointer;
		transition: color 120ms ease, border-color 120ms ease;
	}

	.close:hover {
		color: var(--text);
		border-color: var(--accent);
	}

	.section {
		padding: 16px 18px;
		border-bottom: 1px solid var(--border);
	}

	.section:last-of-type {
		border-bottom: none;
	}

	.section-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.section-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--accent);
	}

	h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	.value {
		margin-left: auto;
		padding: 2px 9px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: 99px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.desc {
		margin: 8px 0 12px;
		padding-left: 38px;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--text-dim);
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.save-actions {
		display: flex;
		gap: 8px;
	}

	.save-actions button {
		flex: 1;
		padding: 10px 14px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font-weight: 600;
		cursor: pointer;
		transition: border-color 120ms ease;
	}

	.save-actions button:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.save-actions button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.error {
		margin: 10px 0 0;
		font-size: 13px;
		color: #ff8a80;
	}

	@media (max-width: 480px) {
		.overlay {
			place-items: end center;
			padding: 0;
		}

		.modal {
			width: 100%;
			border-radius: var(--radius) var(--radius) 0 0;
			animation: sheet-in 200ms ease;
		}

		@keyframes sheet-in {
			from {
				opacity: 0;
				transform: translateY(24px);
			}

			to {
				opacity: 1;
				transform: none;
			}
		}
	}
</style>