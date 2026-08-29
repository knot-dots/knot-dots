<script lang="ts">
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import HelpProperties from '$lib/components/HelpProperties.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { type AnyPayload, type Container, type HelpPayload, predicates } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<HelpPayload>;
		layout?: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
		sections: Container[];
	}

	let { container = $bindable(), layout, revisions, sections }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersQuery = resource(
		[() => guid, () => organization],
		async ([guid, organization], _, { signal }) =>
			fetchRelatedContainers(
				guid,
				{
					organization: [organization],
					relationType: [predicates.enum['is-part-of-category'], predicates.enum['is-section-of']]
				},
				'alpha',
				{ signal }
			)
	);

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		onSuccess: relatedContainersQuery.refetch,
		selected: new SvelteSet<string>()
	});

	let relatedContainers = $derived(relatedContainersQuery.current ?? sections);
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]}>
		{#snippet settings()}
			<SettingsDropdown {container} {relatedContainers} />
		{/snippet}
	</Header>
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('body')}
					bind:value={container.payload.body}
				/>
			{/key}

			<Sections bind:container {relatedContainers} />
		{/snippet}

		{#snippet footer()}
			<footer class="footer-action-bar">
				<DeleteButton {container} {relatedContainers} />
			</footer>
		{/snippet}

		{#snippet properties()}
			<HelpProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>
		{/snippet}
	</EditableContainerDetailView>
{/snippet}

{#if layout}
	{@render layout(header, main)}
{:else}
	{@render header()}
	{@render main()}
{/if}
