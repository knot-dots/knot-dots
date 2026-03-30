<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { resource } from 'runed';
	import { page } from '$app/state';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
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

			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}

			<div class="details-section">
				<select class="view-mode" oninput={(e) => e.stopPropagation()} bind:value={viewMode}>
					<option value="chart">{$_('indicator.view_mode.chart')}</option>
					<option value="table">{$_('indicator.view_mode.table')}</option>
				</select>

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
					/>
				{/if}
			</div>

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
	.view-mode {
		border: none;
		box-shadow: var(--shadow-sm);
		margin: 0 0 1rem;
		width: fit-content;
	}
</style>
