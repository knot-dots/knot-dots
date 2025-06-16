<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import Minus from '~icons/heroicons/minus-small-solid';
	import Plus from '~icons/heroicons/plus-small-solid';
	import requestSubmit from '$lib/client/requestSubmit';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import {
		type AnyContainer,
		type Container,
		type EffectContainer,
		isIndicatorContainer,
		predicates
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: EffectContainer;
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
							predicate == predicates.enum['is-measured-by'] && object == guid
					) > -1
			)
	);

	let newRowKey = $state(0);

	function appendYear() {
		const today = new Date();
		const year =
			container.payload.achievedValues.length == 0
				? today.getFullYear()
				: container.payload.achievedValues[container.payload.achievedValues.length - 1][0] + 1;
		container.payload.achievedValues = [...container.payload.achievedValues, [year, 0]];
		container.payload.plannedValues = [...container.payload.plannedValues, [year, 0]];
		newRowKey = year;
	}

	function prependYear() {
		const year = container.payload.plannedValues[0][0] - 1;
		container.payload.plannedValues = [[year, 0], ...container.payload.plannedValues];
		container.payload.achievedValues = [[year, 0], ...container.payload.achievedValues];
		newRowKey = year;
	}

	function removeYear(index: number) {
		return (event: Event) => {
			container.payload.plannedValues = [
				...container.payload.plannedValues.slice(0, index),
				...container.payload.plannedValues.slice(index + 1)
			];
			container.payload.achievedValues = [
				...container.payload.achievedValues.slice(0, index),
				...container.payload.achievedValues.slice(index + 1)
			];
			requestSubmit(event);
		};
	}

	function updateAchievedValues(index: number) {
		return (event: Event) => {
			container.payload.achievedValues[index][1] = parseFloat(
				(event.currentTarget as HTMLInputElement).value
			);
			requestSubmit(event);
		};
	}

	function updatePlannedValues(index: number) {
		return (event: Event) => {
			container.payload.plannedValues[index][1] = parseFloat(
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

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<PropertyGrid>
			{#snippet bottom()}
				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.visibility}
					/>
				{/if}

				<ManagedBy {container} {relatedContainers} />

				<EditableOrganizationalUnit
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organizational_unit')}
					organization={container.organization}
					bind:value={container.organizational_unit}
				/>

				<EditableOrganization
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organization')}
					bind:value={container.organization}
				/>

				<AuthoredBy {container} {revisions} />
			{/snippet}
		</PropertyGrid>

		{#if indicator}
			{#if $applicationState.containerDetailView.editable}
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
										<th>{$_('indicator.effect.planned_values')}</th>
										<th>{$_('indicator.effect.achieved_values')}</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{#if container.payload.plannedValues.length > 0}
										<tr>
											<td colspan="4">
												<button aria-label={$_('append_row')} onclick={prependYear} type="button">
													<Plus />
												</button>
											</td>
										</tr>
									{/if}

									{#each container.payload.plannedValues as [key], index (key)}
										<tr>
											<td class="year">
												{container.payload.plannedValues[index][0]}
											</td>
											<td class="focus-indicator">
												{#if $applicationState.containerDetailView.editable}
													<input
														inputmode="decimal"
														onchange={updatePlannedValues(index)}
														type="text"
														value={container.payload.plannedValues[index][1]}
														use:init={key === newRowKey}
													/>
												{:else}
													{container.payload.plannedValues[index][1]}
												{/if}
											</td>
											<td class="focus-indicator">
												<input
													inputmode="decimal"
													onchange={updateAchievedValues(index)}
													type="text"
													value={container.payload.achievedValues[index][1]}
												/>
											</td>
											<td>
												{#if index === 0 || index === container.payload.plannedValues.length - 1}
													<button
														aria-label={$_('delete_row')}
														onclick={removeYear(index)}
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
											<button aria-label={$_('append_row')} onclick={appendYear} type="button">
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

			<EffectChart {container} {relatedContainers} showLegend />
		{/if}
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

	.year {
		color: var(--color-gray-900);
	}
</style>
