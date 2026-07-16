<script lang="ts">
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { type AnyPayload, type Container, type PostPayload } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import PostProperties from '$lib/components/PostProperties.svelte';

	interface Props {
		container: Container<PostPayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
		sections: Container[];
	}

	let { container = $bindable(), layout, revisions, sections }: Props = $props();

	let guid = $derived(container.guid);

	let relatedContainersQuery = resource([() => guid], async ([guid], _, { signal }) =>
		fetchRelatedContainers(guid, {}, 'alpha', { signal })
	);

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		onSuccess: relatedContainersQuery.refetch,
		selected: new SvelteSet<string>()
	});

	let relatedContainers = $derived(relatedContainersQuery.current ?? sections);
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<PostProperties
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
					label={$_('body')}
					bind:value={container.payload.body}
				/>
			{/key}

			<Sections bind:container {relatedContainers} />
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<RelationButton {container} />
			<CreateAnotherButton {container} {relatedContainers} />
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
