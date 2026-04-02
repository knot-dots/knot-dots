<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { resource } from 'runed';
	import { page } from '$app/state';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import ChartLineIcon from '~icons/flowbite/chart-outline';
	import TableIcon from '~icons/flowbite/table-row-outline';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import Card from '$lib/components/Card.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import ImpactMonitoringChart from '$lib/components/ImpactMonitoringChart.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import NewIndicatorTable from '$lib/components/NewIndicatorTable.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import {
		type AnyContainer,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isEffectContainer,
		isObjectiveContainer,
		isProgramContainer,
		isRelatedTo,
		titleForProgramCollection
	} from '$lib/models';
	import { ability, applicationState, compareState } from '$lib/stores';

	interface Props {
		container: IndicatorTemplateContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	// Fetch comparison data for selected municipalities
	let selectedMunicipalityGuids = $derived(
		$compareState.selectedMunicipalities.map((m) => m.guid) ?? []
	);

	let relatedContainersQuery = resource(
		[() => guid, () => selectedMunicipalityGuids],
		async ([guid, selectedMunicipalityGuids], __, { signal }) => {
			return fetchRelatedContainers(
				guid,
				{
					organization: [page.data.currentOrganization.guid],
					organizationalUnit: page.data.currentOrganizationalUnit
						? [page.data.currentOrganizationalUnit.guid, ...selectedMunicipalityGuids]
						: []
				},
				'alpha',
				{ signal }
			);
		}
	);

	let relatedContainers = $derived(
		relatedContainersQuery.current?.filter(
			({ organizational_unit }) =>
				!organizational_unit || !selectedMunicipalityGuids.includes(organizational_unit)
		) ?? []
	);

	let comparisonContainers = $derived(
		relatedContainersQuery.current
			?.filter(isActualDataContainer)
			.filter(
				({ organizational_unit }) =>
					organizational_unit && selectedMunicipalityGuids.includes(organizational_unit)
			)
	);

	let viewMode = $state('chart');
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<IndicatorProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>

			<div class="details-section">
				<div class="segmented-button">
					<label class="button">
						<ChartLineIcon />
						{$_('indicator.view_mode.chart')}
						<input
							name="mode"
							type="radio"
							value="chart"
							bind:group={viewMode}
							class="is-visually-hidden"
						/>
					</label>
					<label class="button">
						<TableIcon />
						{$_('indicator.view_mode.table')}
						<input
							name="mode"
							type="radio"
							value="table"
							bind:group={viewMode}
							class="is-visually-hidden"
						/>
					</label>
				</div>

				{#if viewMode === 'chart'}
					{#if relatedContainers.some((c) => isEffectContainer(c) || isObjectiveContainer(c))}
						<ImpactMonitoringChart {container} {relatedContainers} showLegend />
					{:else}
						<NewIndicatorChart {container} {relatedContainers} {comparisonContainers} />
					{/if}
				{:else}
					<NewIndicatorTable
						{container}
						editable={$applicationState.containerDetailView.editable}
						{relatedContainers}
						{comparisonContainers}
					/>
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

			<Sections bind:container {relatedContainers} />

			{#if relatedContainers.filter(isContainerWithEffect).length > 0}
				<div class="details-section">
					<h2 class="details-heading">{$_('measures')}</h2>
					<ul class="carousel">
						{#each relatedContainers.filter(isContainerWithEffect) as measure (measure.guid)}
							<li>
								<Card container={measure} />
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if relatedContainers.filter(isObjectiveContainer).length > 0}
				<div class="details-section">
					<h2 class="details-heading">{$_('goals')}</h2>
					<ul class="carousel">
						{#each relatedContainers.filter(isObjectiveContainer) as objective (objective.guid)}
							{@const goal = relatedContainers
								.filter(isContainerWithObjective)
								.find(isRelatedTo(objective))}
							{#if goal}
								<li>
									<Card container={goal} />
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			{/if}

			{#if relatedContainers.filter(isProgramContainer).length > 0}
				<div class="details-section">
					<h2 class="details-heading">
						{titleForProgramCollection(relatedContainers.filter(isProgramContainer))}
					</h2>
					<ul class="carousel">
						{#each relatedContainers.filter(isProgramContainer) as program (program.guid)}
							<li>
								<Card container={program} />
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}

<style>
	.segmented-button {
		padding: 0 1.5rem;
	}

	.segmented-button .button {
		border-color: var(--color-blue-gray-200);
		padding: 0.5rem 0.75rem;
	}

	.segmented-button * {
		color: var(--color-blue-gray-800);
		font-size: 14px;
		font-style: normal;
		font-weight: 500;
		line-height: 125%; /* 17.5px */
	}

	.segmented-button > .button:has(input:checked) {
		background-color: var(--color-blue-gray-800);
		border-color: var(--color-blue-gray-800);
		color: var(--color-white);
	}
</style>
