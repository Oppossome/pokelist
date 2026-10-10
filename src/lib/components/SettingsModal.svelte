<script lang="ts">
	import {
		Check,
		Copy,
		Download,
		Group,
		Heart,
		LayoutGrid,
		Pencil,
		Plus,
		Save,
		Tag,
		Trash,
		X
	} from '@lucide/svelte';
	import { MAX_SLOTS, MAX_SLOT_NAME, saveDataSchema, store, type SaveData } from '$lib/caught.svelte';
	import { settings } from '$lib/settings.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	// Fresh copy each time the modal opens, saved back on every change.
	let size = $state(0);
	$effect(() => {
		if (open) size = settings.cardSize;
	});

	// Nothing transient should survive a close and reopen. This reads `open`
	// alone on purpose: depending on `settings.cardSize` too would discard an
	// in-progress rename as soon as the size slider moved.
	$effect(() => {
		if (!open) return;
		renamingId = null;
		confirmingDeleteId = null;
		pendingReplace = null;
		slotError = '';
		importError = '';
	});

	// Save slots: `renamingId` is null unless a name is being edited.
	let renamingId = $state<string | null>(null);
	let draftName = $state('');
	let confirmingDeleteId = $state<string | null>(null);
	let pendingReplace = $state<SaveData | null>(null);
	let slotError = $state('');
	let importError = $state('');
	let fileInput = $state<HTMLInputElement>();

	const atLimit = $derived(store.slots.length >= MAX_SLOTS);
	const canDelete = $derived(store.slots.length > 1);
	const confirming = $derived(store.slots.find((slot) => slot.id === confirmingDeleteId));

	function startRename(id: string) {
		renamingId = id;
		draftName = store.slots.find((slot) => slot.id === id)?.name ?? '';
		slotError = '';
	}

	function saveRename() {
		if (renamingId === null) return;
		const original = store.slots.find((slot) => slot.id === renamingId);
		if (original && draftName.trim() === original.name) {
			cancelRename();
			return;
		}
		try {
			store.renameSlot(renamingId, draftName);
			cancelRename();
		} catch (err) {
			// Keep the field open so the name can be fixed.
			slotError = err instanceof Error ? err.message : 'Could not rename that save';
		}
	}

	function cancelRename() {
		renamingId = null;
		draftName = '';
		slotError = '';
	}

	function onRenameKeydown(event: KeyboardEvent) {
		// Escape cancels the rename, not the whole modal (see onWindowKeydown).
		event.stopPropagation();
		if (event.key === 'Enter') saveRename();
		if (event.key === 'Escape') cancelRename();
	}

	function requestDelete(id: string) {
		if (!canDelete) return;
		confirmingDeleteId = id;
		slotError = '';
	}

	function duplicateSave(id: string) {
		// A disabled button is not always enough — the cap is enforced here too.
		if (atLimit) {
			slotError = `You can keep up to ${MAX_SLOTS} saves. Delete one first.`;
			return;
		}
		store.duplicateSlot(id);
	}

	function confirmDelete() {
		if (confirmingDeleteId === null) return;
		store.deleteSlot(confirmingDeleteId);
		if (renamingId === confirmingDeleteId) cancelRename();
		confirmingDeleteId = null;
	}

	function exportSave(id: string) {
		let save;
		try {
			save = store.exportSave(id);
		} catch (err) {
			slotError = err instanceof Error ? err.message : 'Could not export that save';
			return;
		}
		const slot = store.slots.find((candidate) => candidate.id === id);
		const slug = slot?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
		const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pokelist-${slug || 'save'}-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function replaceSave(data: SaveData) {
		importError = '';
		try {
			store.importSave(data);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read that file';
		}
	}

	function confirmReplace() {
		if (!pendingReplace) return;
		replaceSave(pendingReplace);
		pendingReplace = null;
	}

	async function importSave(event: Event) {
		importError = '';
		pendingReplace = null;
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			// Validate before asking to replace, so a bad file never prompts.
			const parsed = saveDataSchema.safeParse(JSON.parse(await file.text()));
			if (!parsed.success) {
				throw new Error(parsed.error.issues[0]?.message ?? 'Invalid save file');
			}
			if (store.count > 0) {
				pendingReplace = parsed.data;
				return;
			}
			replaceSave(parsed.data);
		} catch (err) {
			// A parse failure's message is aimed at developers, not users.
			importError =
				err instanceof Error && !(err instanceof SyntaxError)
					? err.message
					: 'Could not read that file';
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

	function selectOnMount(el: HTMLInputElement) {
		el.focus();
		el.select();
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

			<div class="body">
				<section class="section">
					<div class="section-head">
						<span class="section-icon" aria-hidden="true">
							<Group size={14} strokeWidth={2} />
						</span>
						<h3>Grouping</h3>
					</div>
				<p class="desc">Split the grid into generations, or show one continuous list.</p>
				<div class="segmented" role="radiogroup" aria-label="Grid grouping">
					<button
						type="button"
						role="radio"
						aria-checked={settings.groupBy === 'generation'}
						class:on={settings.groupBy === 'generation'}
						onclick={() => settings.setGroupBy('generation')}
					>
						By generation
					</button>
					<button
						type="button"
						role="radio"
						aria-checked={settings.groupBy === 'none'}
						class:on={settings.groupBy === 'none'}
						onclick={() => settings.setGroupBy('none')}
					>
						None
					</button>
				</div>
			</section>

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
						<Tag size={14} strokeWidth={2} />
					</span>
					<h3>Type chips</h3>
					<button
						type="button"
						class="switch"
						class:on={settings.showTypes}
						role="switch"
						aria-checked={settings.showTypes}
						onclick={() => settings.toggleTypes()}
					>
						<span class="knob"></span>
						<span class="sr-only">Toggle type chips</span>
					</button>
				</div>
				<p class="desc">Show each Pokémon's type badges on its card.</p>
			</section>

			<section class="section">
				<div class="section-head">
					<span class="section-icon" aria-hidden="true">
						<Save size={14} strokeWidth={2} />
					</span>
					<h3>Saves</h3>
					<span class="value name-chip" title={store.active.name}>{store.active.name}</span>
				</div>
				<p class="desc">
					Your catches live only in this browser. Keep one save per game or run and
					switch between them here — each one exports on its own.
				</p>

				<div class="save-block">
					<div class="slots" role="radiogroup" aria-label="Active save">
						{#each store.slots as slot (slot.id)}
							{@const isActive = slot.id === store.activeId}
							<div class="slot" class:on={isActive} class:flagged={confirmingDeleteId === slot.id}>
								{#if renamingId === slot.id}
									<div class="rename">
										<input
											type="text"
											aria-label="Save name"
											maxlength={MAX_SLOT_NAME}
											bind:value={draftName}
											oninput={() => (slotError = '')}
											onkeydown={onRenameKeydown}
											onblur={saveRename}
											use:selectOnMount
										/>
										<button
											type="button"
											class="mini"
											aria-label="Confirm rename"
											title="Save name"
											onclick={saveRename}
										>
											<Check size={13} strokeWidth={2.5} aria-hidden="true" />
										</button>
									</div>
								{:else}
									<button
										type="button"
										class="slot-pick"
										role="radio"
										aria-checked={isActive}
										onclick={() => store.selectSlot(slot.id)}
									>
										<span class="slot-check" aria-hidden="true">
											{#if isActive}<Check size={11} strokeWidth={4} />{/if}
										</span>
										<span class="slot-text">
											<span class="slot-name">{slot.name}</span>
											<span class="slot-meta">{slot.caught.length} caught</span>
										</span>
									</button>
									<div class="slot-actions">
										<button
											type="button"
											class="mini"
											aria-label={`Export ${slot.name}`}
											title={slot.caught.length === 0 ? 'Nothing to export yet' : 'Export'}
											disabled={slot.caught.length === 0}
											onclick={() => exportSave(slot.id)}
										>
											<Download size={13} strokeWidth={2} aria-hidden="true" />
										</button>
										<button
											type="button"
											class="mini"
											aria-label={`Rename ${slot.name}`}
											title="Rename"
											onclick={() => startRename(slot.id)}
										>
											<Pencil size={13} strokeWidth={2} aria-hidden="true" />
										</button>
										<button
											type="button"
											class="mini"
											aria-label={`Duplicate ${slot.name}`}
											title={atLimit ? 'Save limit reached' : 'Duplicate'}
											disabled={atLimit}
											onclick={() => duplicateSave(slot.id)}
										>
											<Copy size={13} strokeWidth={2} aria-hidden="true" />
										</button>
										<button
											type="button"
											class="mini danger"
											aria-label={`Delete ${slot.name}`}
											title={canDelete ? 'Delete' : 'You need at least one save'}
											disabled={!canDelete}
											onclick={() => requestDelete(slot.id)}
										>
											<Trash size={13} strokeWidth={2} aria-hidden="true" />
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					{#if confirming}
						<div class="confirm">
							<span>
								Delete <strong>{confirming.name}</strong> and its
								{confirming.caught.length} caught?
							</span>
							<button type="button" class="danger" onclick={confirmDelete}>Delete</button>
							<button type="button" onclick={() => (confirmingDeleteId = null)}>Cancel</button>
						</div>
					{/if}

					<div class="save-actions">
						<button type="button" disabled={atLimit} onclick={() => store.createSlot()}>
							<Plus size={14} strokeWidth={2} aria-hidden="true" />
							New
						</button>
						<button type="button" onclick={() => fileInput?.click()}>Import</button>
						<input
							type="file"
							accept="application/json,.json"
							hidden
							bind:this={fileInput}
							onchange={importSave}
						/>
					</div>

					{#if atLimit}
						<p class="hint">Save limit reached — delete one to add another.</p>
					{/if}

					{#if pendingReplace}
						<div class="confirm">
							<span>Replace the catches in <strong>{store.active.name}</strong>?</span>
							<button type="button" class="danger" onclick={confirmReplace}>Replace</button>
							<button type="button" onclick={() => (pendingReplace = null)}>Cancel</button>
						</div>
					{/if}

					{#if slotError}
						<p class="error" role="alert">{slotError}</p>
					{/if}
					{#if importError}
						<p class="error" role="alert">{importError}</p>
					{/if}
				</div>
			</section>

			<section class="section">
				<div class="section-head">
					<span class="section-icon" aria-hidden="true">
						<Heart size={14} strokeWidth={2} />
					</span>
					<h3>About</h3>
				</div>
				<p class="desc">
					Made with lots of love — and a very patient wife who deserves a huge
					thank you. ❤️
				</p>
				<a
					class="repo-link"
					href="https://github.com/Oppossome/pokelist"
					target="_blank"
					rel="noopener noreferrer"
				>
					View source on GitHub
				</a>
			</section>
			</div>
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
		display: flex;
		flex-direction: column;
		width: min(440px, 100%);
		max-height: min(640px, calc(100dvh - 40px));
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
		animation: modal-in 160ms ease;
	}

	.body {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
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

	.name-chip {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.switch {
		display: flex;
		align-items: center;
		margin-left: auto;
		width: 38px;
		height: 22px;
		padding: 2px;
		background: var(--border);
		border: none;
		border-radius: 99px;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.switch.on {
		background: var(--caught);
	}

	.knob {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
		transition: transform 150ms ease;
	}

	.switch.on .knob {
		transform: translateX(18px);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.desc {
		margin: 8px 0 12px;
		padding-left: 38px;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--text-dim);
	}

	input[type='range'] {
		width: calc(100% - 38px);
		margin-left: 38px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin-left: 38px;
		padding: 3px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.segmented button {
		padding: 8px 10px;
		background: transparent;
		border: none;
		border-radius: 7px;
		color: var(--text-dim);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease;
	}

	.segmented button:hover:not(.on) {
		color: var(--text);
	}

	.segmented button.on {
		background: var(--accent);
		color: var(--bg);
	}

	/* Everything below a section's description shares the description's indent. */
	.save-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-left: 38px;
	}

	.slots {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.slot {
		display: flex;
		align-items: stretch;
		gap: 4px;
		padding: 4px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		transition: background 120ms ease, border-color 120ms ease;
	}

	.slot.on {
		background: var(--card-caught);
		border-color: var(--caught);
	}

	.slot.flagged {
		border-color: var(--accent);
	}

	.slot-pick {
		display: flex;
		align-items: center;
		gap: 9px;
		flex: 1;
		min-width: 0;
		padding: 6px 8px;
		background: transparent;
		border: none;
		border-radius: 8px;
		text-align: left;
		cursor: pointer;
	}

	.slot-check {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		border: 1px solid var(--border);
		border-radius: 50%;
		color: var(--bg);
	}

	.slot.on .slot-check {
		background: var(--caught);
		border-color: var(--caught);
	}

	.slot-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.slot-name {
		overflow: hidden;
		font-size: 13px;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.slot.on .slot-name {
		color: var(--caught);
	}

	.slot-meta {
		font-size: 11.5px;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.slot-actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.mini {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		padding: 0;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 7px;
		color: var(--text-dim);
		cursor: pointer;
		transition: color 120ms ease, border-color 120ms ease;
	}

	.mini:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border);
	}

	.mini.danger:hover:not(:disabled) {
		color: #ff8a80;
		border-color: #ff8a80;
	}

	.mini:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.rename {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
		min-width: 0;
		padding-left: 4px;
	}

	.rename input {
		flex: 1;
		min-width: 0;
		padding: 6px 8px;
		background: var(--card);
		border: 1px solid var(--accent);
		border-radius: 8px;
		color: var(--text);
		font-size: 13px;
	}

	.confirm {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 6px 6px 10px;
		background: rgba(239, 83, 80, 0.08);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 12.5px;
		color: var(--text-dim);
	}

	.confirm span {
		flex: 1;
		min-width: 0;
	}

	.confirm strong {
		color: var(--text);
	}

	.confirm button {
		flex-shrink: 0;
		padding: 5px 10px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 7px;
		color: var(--text);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.confirm button:hover {
		border-color: var(--accent);
	}

	.confirm button.danger:hover {
		border-color: #ff8a80;
	}

	.save-actions {
		display: flex;
		gap: 8px;
	}

	.save-actions button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
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

	.hint {
		margin: 0;
		font-size: 12px;
		color: var(--text-dim);
	}

	.error {
		margin: 0;
		font-size: 13px;
		color: #ff8a80;
	}

	.repo-link {
		display: inline-block;
		margin-left: 38px;
		padding: 8px 14px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		transition: border-color 120ms ease;
	}

	.repo-link:hover {
		border-color: var(--accent);
	}

	@media (max-width: 480px) {
		.overlay {
			place-items: end center;
			padding: 0;
		}

		.modal {
			width: 100%;
			max-height: calc(100dvh - 24px);
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
