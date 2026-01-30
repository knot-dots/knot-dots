<script lang="ts">
	import type { Snippet } from 'svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import type { AnyContainer, Container, ContentPartnerContainer } from '$lib/models';
	import ContentPartnerProperties from './ContentPartnerProperties.svelte';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: ContentPartnerContainer;
		layout: Snippet<[Snippet, Snippet]>;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, relatedContainers, revisions }: Props = $props();
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<ContentPartnerProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{revisions}
			/>
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
