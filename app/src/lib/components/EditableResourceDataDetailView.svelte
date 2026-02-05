<script lang="ts">
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableResourceDataTable from '$lib/components/EditableResourceDataTable.svelte';
	import ResourceDataProperties from '$lib/components/ResourceDataProperties.svelte';
	import {
		predicates,
		type AnyContainer,
		type ResourceDataContainer,
		type ResourceV2Container
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { _ } from 'svelte-i18n';
	import EditableFormattedText from './EditableFormattedText.svelte';
	import Sections from './Sections.svelte';
	import Header from './Header.svelte';
	import { fetchRelatedContainers } from '$lib/remote/data.remote';
	import type { Snippet } from 'svelte';
	import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';

	interface Props {
		container: ResourceDataContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersQuery = $derived(
		fetchRelatedContainers({
			guid,
			params: {
				organization: [organization],
				relationType: [
					predicates.enum['is-consistent-with'],
					predicates.enum['is-equivalent-to'],
					predicates.enum['is-inconsistent-with'],
					predicates.enum['is-measured-by'],
					predicates.enum['is-objective-for'],
					predicates.enum['is-part-of'],
					predicates.enum['is-part-of-category'],
					predicates.enum['is-section-of']
				]
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let currentResource = $state<ResourceV2Container | undefined>(undefined);

	$effect(() => {
		fetchContainerRevisions(container.payload.resource).then((revisions) => {
			currentResource = (revisions[revisions.length - 1] as ResourceV2Container) ?? undefined;
		});
	});
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<ResourceDataProperties
				{container}
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

			<EditableResourceDataTable
				{container}
				editable={Boolean(
					$applicationState.containerDetailView.editable && $ability.can('update', container)
				)}
				title={$_(container.payload.resourceDataType)}
				unit={$_(currentResource?.payload.resourceUnit ?? 'undefined')}
			/>

			<Sections bind:container {relatedContainers} />
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
