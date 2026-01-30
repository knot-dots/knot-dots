<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import TextProperties from '$lib/components/TextProperties.svelte';
	import { type AnyContainer, type Container, type TextContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: TextContainer;
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
			<TextProperties
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
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<CreateAnotherButton {container} {relatedContainers} />
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
