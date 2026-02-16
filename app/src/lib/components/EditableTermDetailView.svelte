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
	import { predicates, type AnyContainer, type TermContainer } from '$lib/models';
	import { fetchRelatedContainers } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: TermContainer;
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
