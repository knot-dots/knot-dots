<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import NewIndicatorTable from '$lib/components/NewIndicatorTable.svelte';
	import { type AnyContainer, type IndicatorTemplateContainer } from '$lib/models';
	import { fetchContainersRelatedToIndicatorTemplates } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: IndicatorTemplateContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let relatedContainersQuery = $derived(
		fetchContainersRelatedToIndicatorTemplates({
			guid,
			params: {
				organization: page.data.currentOrganization.guid,
				...(page.data.currentOrganizationalUnit
					? { organizationalUnit: page.data.currentOrganizationalUnit.guid }
					: undefined)
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

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
