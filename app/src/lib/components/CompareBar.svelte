<script lang="ts">
	import type { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Close from '~icons/knotdots/close';
	import MunicipalityPicker from '$lib/components/MunicipalityPicker.svelte';
	import { compareState } from '$lib/stores';
	import { untrack } from 'svelte';

	interface Props {
		disclosure: ReturnType<typeof createDisclosure>;
	}

	let { disclosure }: Props = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	const colors = [
		'--indicator-color-compare-1-base',
		'--indicator-color-compare-2-base',
		'--indicator-color-compare-3-base',
		'--indicator-color-compare-4-base',
		'--indicator-color-compare-5-base'
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

	// Open the picker dialog when the compare bar is expanded but no municipalities are selected
	$effect(() => {
		if ($disclosure.expanded && untrack(() => $compareState.selectedMunicipalities.length === 0)) {
			openPicker();
		}
	});

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
	<fieldset class="compare-bar" use:disclosure.panel>
		<span class="aria-hidden">{$_('compare_with')}</span>

		{#if $compareState.selectedMunicipalities.length > 0}
			<button
				aria-label={$_('compare_clear_all')}
				class="button-outline button-xs"
				onclick={clearAll}
				type="button"
			>
				<Close />
			</button>
		{/if}

		{#each $compareState.selectedMunicipalities as municipality (municipality.guid)}
			<div class="badge badge--large badge--municipality">
				<span
					class="municipality-color"
					style:background-color={$compareState.colorAssignments[municipality.guid]
						? `var(${$compareState.colorAssignments[municipality.guid]})`
						: 'transparent'}
				></span>
				<span class="municipality-name">{municipality.payload.name}</span>
				<button
					class="municipality-remove"
					onclick={() => removeMunicipality(municipality.guid)}
					title={$_('compare_remove')}
					type="button"
				>
					<Close />
				</button>
			</div>
		{/each}

		<button
			class="municipality-add"
			disabled={$compareState.selectedMunicipalities.length >= 5}
			onclick={openPicker}
			type="button"
		>
			<Plus />
			{$_('compare_add_dataset')}
		</button>
	</fieldset>
{/if}

<style>
	.compare-bar {
		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		background-color: var(--color-primary-050);
		border: 1px solid var(--color-primary-200);
		border-radius: 9999rem;
		display: flex;
		flex-direction: row;
		font-size: 0.875rem;
		gap: 0.25rem;
		justify-content: safe center;
		overflow: auto;
		padding: 0.375rem;
	}

	.compare-bar > * {
		flex-shrink: 0;
		justify-content: safe center;
	}

	.compare-bar > span:first-child {
		color: var(--color-primary-700);
		padding: 0 0.25rem 0 0.5rem;
	}

	.compare-bar > button:first-of-type {
		margin-right: 0.75rem;
	}

	.badge.badge--municipality {
		border: 1px solid var(--color-primary-100);
		background: var(--cololr-primary-025);
	}

	.municipality-color {
		border-radius: 50%;
		display: block;
		flex-grow: 0;
		flex-shrink: 0;
		height: 10px;
		width: 10px;
	}

	.municipality-name {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 1;
		max-width: 10rem;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.municipality-remove {
		background: transparent;
		border: none;
		color: var(--color-gray-500);
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
	}

	.municipality-remove :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.municipality-add {
		--button-background: transparent;
		--button-active-background: var(--color-primary-300);
		--button-disabled-background: transparent;
		--button-hover-background: var(--color-primary-100);

		border: none;
		color: var(--color-gray-700);
		padding: 0.5rem 0.625rem;
		white-space: nowrap;
	}

	.municipality-add:active {
		color: var(--color-primary-700);
	}

	.municipality-add:disabled {
		color: var(--color-gray-400);
	}

	.municipality-add :global(svg) {
		height: 0.875rem;
		width: 0.875rem;
	}
</style>
