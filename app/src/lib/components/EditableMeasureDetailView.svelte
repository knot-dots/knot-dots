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
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import PropertiesRelocationNotice from '$lib/components/PropertiesRelocationNotice.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type AnyPayload,
		type Container,
		type MeasurePayload,
		type SimpleMeasurePayload
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<MeasurePayload | SimpleMeasurePayload>;
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
			<PropertiesRelocationNotice />

			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}

			<Sections bind:container {relatedContainers} />
		{/snippet}

		{#snippet footer()}
			<footer class="footer-action-bar">
				<RelationButton {container} />
				<CreateAnotherButton {container} {relatedContainers} />
				<CreateCopyButton {container} />
				<DeleteButton {container} {relatedContainers} />
			</footer>
		{/snippet}

		{#snippet properties()}
			<MeasureProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>
		{/snippet}
	</EditableContainerDetailView>
{/snippet}

{@render layout(header, main)}
