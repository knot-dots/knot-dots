<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CategoryTerms from '$lib/components/CategoryTerms.svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import TermProperties from '$lib/components/TermProperties.svelte';
	import { predicates, type AnyContainer, type Container, type TermContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: TermContainer;
		layout: Snippet<[Snippet, Snippet]>;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, relatedContainers, revisions }: Props = $props();

	const editable = $derived(
		$applicationState.containerDetailView.editable && $ability.can('update', container)
	);
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<TermProperties bind:container {editable} {relatedContainers} {revisions} />

			{#key container.guid}
				<EditableFormattedText
					{editable}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}

			<CategoryTerms
				headingKey="category.subterms.heading"
				predicate={predicates.enum['is-part-of']}
				bind:container
				bind:relatedContainers
			/>
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
