<script lang="ts">
	import type { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Close from '~icons/knotdots/close';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import MunicipalityPicker from '$lib/components/MunicipalityPicker.svelte';
	import { compareState } from '$lib/stores';

	interface Props {
		disclosure: ReturnType<typeof createDisclosure>;
	}

	let { disclosure }: Props = $props();

	let dialog: HTMLDialogElement = $state(undefined!);

	const colors = [
		'--indicator-color-compare-1-base',
		'--indicator-color-compare-2-base',
		'--indicator-color-compare-3-base'
	];

	function openPicker() {
		dialog?.showModal();
	}

	function removeMunicipality(guid: string) {
		compareState.update((state) => {
			const newAssignments = { ...state.colorAssignments };
			delete newAssignments[guid];
			return {
				selectedMunicipalities: state.selectedMunicipalities.filter((m) => m.guid !== guid),
				colorAssignments: newAssignments
			};
		});
	}

	function clearAll() {
		compareState.set({ selectedMunicipalities: [], colorAssignments: {} });
	}

	// Assign colors to municipalities that don't have one yet
	$effect(() => {
		const currentAssignments = $compareState.colorAssignments;
		const currentMunicipalities = $compareState.selectedMunicipalities;

		// Find municipalities without color assignments
		const unassigned = currentMunicipalities.filter((m) => !currentAssignments[m.guid]);

		if (unassigned.length > 0) {
			// Find which colors are currently in use
			const usedColors = new Set(Object.values(currentAssignments));
			const availableColors = colors.filter((c) => !usedColors.has(c));

			// Assign colors to unassigned municipalities
			const newAssignments = { ...currentAssignments };
			for (let i = 0; i < unassigned.length && i < availableColors.length; i++) {
				newAssignments[unassigned[i].guid] = availableColors[i];
			}

			compareState.update((state) => ({
				...state,
				colorAssignments: newAssignments
			}));
		}
	});
</script>

<MunicipalityPicker bind:dialog bind:selected={$compareState.selectedMunicipalities} />

{#if $disclosure.expanded}
	<fieldset aria-labelledby="legend" class="compare-bar" use:disclosure.panel>
		<legend class="is-visually-hidden">{$_('compare')}</legend>

		<div class="compare-bar__label">
			<span class="compare-bar__label-text">{$_('compare_with')}</span>

			{#if $compareState.selectedMunicipalities.length > 0}
				<button
					class="compare-bar__clear-button"
					onclick={clearAll}
					title={$_('compare_clear_all')}
					type="button"
				>
					<Close />
				</button>
			{/if}
		</div>

		<div class="municipality-list">
			{#each $compareState.selectedMunicipalities as municipality (municipality.guid)}
				<div class="municipality-chip">
					<span
						class="chip-color"
						style:background-color={$compareState.colorAssignments[municipality.guid]
							? `var(${$compareState.colorAssignments[municipality.guid]})`
							: 'transparent'}
					></span>
					<span class="chip-name">{municipality.payload.name}</span>
					<button
						class="chip-remove"
						onclick={() => removeMunicipality(municipality.guid)}
						title={$_('compare_remove')}
						type="button"
					>
						<CloseCircle />
					</button>
				</div>
			{/each}
		</div>

		<button
			class="compare-bar__button"
			disabled={$compareState.selectedMunicipalities.length >= 3}
			onclick={openPicker}
			type="button"
		>
			<Plus />
			<span>{$_('compare_add_municipality')}</span>
		</button>
	</fieldset>
{/if}

<style>
	.compare-bar {
		align-items: center;
		align-self: stretch;
		display: flex;
		gap: 0.5rem;
		height: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 0 0.5rem;
	}

	.compare-bar__label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.compare-bar__label-text {
		color: var(--color-primary-700);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		white-space: nowrap;
	}

	.compare-bar__clear-button {
		align-items: center;
		border: 1px solid var(--color-primary-700);
		border-radius: 0.5rem;
		color: var(--color-primary-700);
		display: flex;
		flex-shrink: 0;
		justify-content: center;
		padding: 0.5rem 0.75rem;
	}

	.compare-bar__clear-button :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.compare-bar__clear-button:hover {
		background: var(--color-primary-200);
	}

	.municipality-list {
		display: flex;
		align-items: center;
		align-self: stretch;
		gap: 0.25rem;
		min-width: 0;
		overflow-x: auto;
		padding: 0 0.75rem;
	}

	.municipality-chip {
		align-items: center;
		background-color: var(--color-primary-025);
		border: 1px solid var(--color-primary-100);
		border-radius: 6px;
		display: flex;
		gap: 0.5rem;
		min-width: 8rem;
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
		white-space: nowrap;
	}

	.chip-color {
		border-radius: 50%;
		display: block;
		flex-shrink: 0;
		height: 10px;
		width: 10px;
	}

	.chip-name {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chip-remove {
		background: transparent;
		border: none;
		border-radius: 50%;
		color: var(--color-gray-500);
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
		transition: color 0.15s ease;
	}

	.chip-remove :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.chip-remove:hover {
		color: var(--color-red-600);
	}

	.compare-bar__button {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-700);
		display: flex;
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.375rem;
		height: 2.25rem;
		padding: 0 0.625rem;
		white-space: nowrap;
	}

	.compare-bar__button:hover:not(:disabled) {
		background: var(--color-primary-200);
	}

	.compare-bar__button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.compare-bar__button :global(svg) {
		height: 0.875rem;
		width: 0.875rem;
	}
</style>
