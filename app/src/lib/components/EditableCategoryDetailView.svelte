<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import CategoryProperties from '$lib/components/CategoryProperties.svelte';
	import CategoryTerms from '$lib/components/CategoryTerms.svelte';
	import { type CategoryContainer, type Container } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: CategoryContainer;
		relatedContainers: Container[];
	}

	let { container = $bindable(), relatedContainers }: Props = $props();
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<CategoryProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
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
		<CreateAnotherButton {container} {relatedContainers} />
		<CreateCopyButton {container} />
		<DeleteButton {container} {relatedContainers} />
	</div>
</footer>
