<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import HelpProperties from '$lib/components/HelpProperties.svelte';
	import type { AnyContainer, HelpContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: HelpContainer;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<HelpProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
			relatedContainers={[]}
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
