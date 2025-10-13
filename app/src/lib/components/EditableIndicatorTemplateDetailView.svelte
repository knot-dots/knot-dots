<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import NewIndicatorTable from '$lib/components/NewIndicatorTable.svelte';
	import { type AnyContainer, type Container, type IndicatorTemplateContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

	let viewMode = $state('chart');
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<IndicatorProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
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

		{#if relatedContainers.length > 0}
			<div class="details-section">
				<select class="view-mode" oninput={(e) => e.stopPropagation()} bind:value={viewMode}>
					<option value="chart">{$_('indicator.view_mode.chart')}</option>
					<option value="table">{$_('indicator.view_mode.table')}</option>
				</select>

				{#if viewMode === 'chart'}
					<NewIndicatorChart {container} {relatedContainers} />
				{:else}
					<NewIndicatorTable
						{container}
						editable={$applicationState.containerDetailView.editable}
						{relatedContainers}
					/>
				{/if}
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

<style>
	.view-mode {
		border: none;
		box-shadow: var(--shadow-sm);
		margin: 0 0 1rem;
		width: fit-content;
	}
</style>
