<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PuzzlePiece from '~icons/heroicons/puzzle-piece-20-solid';
	import TableCells from '~icons/heroicons/table-cells-20-solid';
	import Effects from '~icons/knotdots/effects';
	import Info from '~icons/knotdots/info';
	import Resources from '~icons/knotdots/resources';
	import { browser } from '$app/environment';
	import {
		boards,
		isContainerWithEffect,
		isIndicatorContainer,
		hasHistoricalValues
	} from '$lib/models';
	import type { AnyContainer, ContainerFormTabKey } from '$lib/models';
	import { applicationState, getOrganization, getOrganizationalUnit } from '$lib/stores';

	export let container: AnyContainer;

	let showEffectsTab: boolean;
	let showHistoricalValuesTab: boolean;

	$: {
		const organizationOrOrganizationalUnit = container.organizational_unit
			? $getOrganizationalUnit(container.organizational_unit)
			: $getOrganization(container.organization);

		showEffectsTab =
			isContainerWithEffect(container) &&
			organizationOrOrganizationalUnit?.payload.boards.includes(boards.enum['board.indicators']);

		showHistoricalValuesTab = isIndicatorContainer(container) && hasHistoricalValues(container);
	}

	function updateApplicationState(activeTab: ContainerFormTabKey) {
		applicationState.update((state) => ({
			...state,
			containerForm: { ...state.containerForm, activeTab }
		}));
		if (browser) {
			const element = document.getElementById(activeTab);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}
</script>

{#if $applicationState.containerForm.tabs.includes('metadata')}
	<li>
		<button
			title={$_('form.metadata')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('metadata')}
		>
			<PuzzlePiece />
		</button>
	</li>
{/if}
{#if $applicationState.containerForm.tabs.includes('basic-data')}
	<li>
		<button
			title={$_('form.basic_data')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('basic-data')}
		>
			<Info />
		</button>
	</li>
{/if}
{#if $applicationState.containerForm.tabs.includes('resources')}
	<li>
		<button
			title={$_('form.resources')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('resources')}
		>
			<Resources />
		</button>
	</li>
{/if}
{#if $applicationState.containerForm.tabs.includes('effects') && showEffectsTab}
	<li>
		<button
			title={$_('form.effects')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('effects')}
		>
			<Effects />
		</button>
	</li>
{/if}
{#if $applicationState.containerForm.tabs.includes('historical-values') && showHistoricalValuesTab}
	<li>
		<button
			title={$_('form.historical_values')}
			type="button"
			class="button-nav button-square"
			on:click={() => updateApplicationState('historical-values')}
		>
			<TableCells />
		</button>
	</li>
{/if}
