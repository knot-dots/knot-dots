<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageProperties from '$lib/components/PageProperties.svelte';
	import type { AnyContainer, Container, PageContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: PageContainer;
		layout: Snippet<[Snippet, Snippet]>;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, relatedContainers, revisions }: Props = $props();
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<PageProperties
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
{/snippet}

{@render layout(header, main)}
