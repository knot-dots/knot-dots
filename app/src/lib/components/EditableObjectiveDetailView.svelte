<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import Minus from '~icons/heroicons/minus-small-solid';
	import Plus from '~icons/knotdots/plus';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import ObjectiveProperties from '$lib/components/ObjectiveProperties.svelte';
	import {
		type AnyContainer,
		type Container,
		isIndicatorContainer,
		type ObjectiveContainer,
		predicates
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: ObjectiveContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

	const disclosure = createDisclosure({});

	let indicator = $derived(
		relatedContainers
			.filter(isIndicatorContainer)
			.find(
				({ guid }) =>
					container.relation.findIndex(
						({ object, predicate }) =>
							predicate == predicates.enum['is-objective-for'] && object == guid
					) > -1
			)
	);

	let newRowKey = $state(0);

	function append() {
		const today = new Date();
		const year =
			container.payload.wantedValues.length == 0
				? today.getFullYear()
				: container.payload.wantedValues[container.payload.wantedValues.length - 1][0] + 1;
		container.payload.wantedValues = [...container.payload.wantedValues, [year, 0]];
		newRowKey = year;
	}

	function prepend() {
		const year = container.payload.wantedValues[0][0] - 1;
		container.payload.wantedValues = [[year, 0], ...container.payload.wantedValues];
		newRowKey = year;
	}

	function remove(index: number) {
		return (event: Event) => {
			container.payload.wantedValues = [
				...container.payload.wantedValues.slice(0, index),
				...container.payload.wantedValues.slice(index + 1)
			];
			requestSubmit(event);
		};
	}

	function update(index: number) {
		return (event: Event) => {
			container.payload.wantedValues[index][1] = parseFloat(
				(event.currentTarget as HTMLInputElement).value
			);
			requestSubmit(event);
		};
	}

	function init(element: HTMLInputElement, shouldFocus: boolean) {
		if (shouldFocus) {
			element.focus();
			element.select();
		}
	}
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<ObjectiveProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
			{relatedContainers}
			{revisions}
		/>

		<div class="details-section">
			{#if indicator}
				{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
					{@const historicalValuesByYear = new Map(indicator.payload.historicalValues)}
					<div class="disclosure">
						<button class="disclosure-button" type="button" use:disclosure.button>
							<span>
								<small>{$_('indicator.table.edit')}</small>
								<strong>{indicator.payload.title} ({$_(indicator.payload.unit ?? '')})</strong>
							</span>
							{#if $disclosure.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
						</button>

						{#if $disclosure.expanded}
							<div transition:slide={{ duration: 125, easing: cubicInOut }} use:disclosure.panel>
								<table>
									<thead>
										<tr>
											<th>{$_('indicator.table.year')}</th>
											<th>{$_('indicator.wanted_values')}</th>
											<th>{$_('indicator.table.historical_values')}</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										{#if container.payload.wantedValues.length > 0}
											<tr>
												<td colspan="4">
													<button aria-label={$_('append_row')} onclick={prepend} type="button">
														<Plus />
													</button>
												</td>
											</tr>
										{/if}

										{#each container.payload.wantedValues as [key], index (key)}
											<tr>
												<td class="year">
													{container.payload.wantedValues[index][0]}
												</td>
												<td class="focus-indicator">
													<input
														inputmode="decimal"
														onchange={update(index)}
														type="text"
														value={container.payload.wantedValues[index][1]}
														use:init={key === newRowKey}
													/>
												</td>
												<td class="historical-values">
													{historicalValuesByYear.get(container.payload.wantedValues[index][0])}
												</td>
												<td>
													{#if index === 0 || index === container.payload.wantedValues.length - 1}
														<button
															aria-label={$_('delete_row')}
															onclick={remove(index)}
															type="button"
														>
															<Minus />
														</button>
													{/if}
												</td>
											</tr>
										{/each}

										<tr>
											<td colspan="4">
												<button aria-label={$_('append_row')} onclick={append} type="button">
													<Plus />
												</button>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/if}

				<ObjectiveChart {container} {relatedContainers} />
			{/if}
		</div>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>

<style>
	input {
		background-color: transparent;
		border: none;
		border-radius: 0;
		line-height: 1.5;
		padding: 0;
		text-align: right;
		width: 100%;
	}

	table {
		width: fit-content;
	}

	tr:last-of-type {
		border-bottom: none;
	}

	th {
		color: var(--color-gray-600);
		font-weight: 400;
	}

	td > button {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0;
		--padding-y: 0;

		border: none;
		color: var(--color-gray-500);
		display: block;
	}

	td:hover,
	tr:hover td:hover input {
		background-color: var(--color-gray-100);
	}

	tr:hover,
	tr:hover input {
		background-color: var(--color-gray-050);
	}

	.disclosure {
		margin-bottom: 1rem;
	}

	.focus-indicator input:focus {
		outline-style: none;
	}

	.historical-values {
		text-align: right;
	}

	.year {
		color: var(--color-gray-900);
	}
</style>
