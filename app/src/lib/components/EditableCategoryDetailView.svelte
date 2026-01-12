<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import CategoryProperties from '$lib/components/CategoryProperties.svelte';
	import CategoryTerms from '$lib/components/CategoryTerms.svelte';
	import { type AnyContainer, type CategoryContainer, type Container } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: CategoryContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<CategoryProperties
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

		<CategoryTerms bind:container bind:relatedContainers />
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
