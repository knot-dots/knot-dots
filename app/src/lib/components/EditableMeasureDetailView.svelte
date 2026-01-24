<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import {
		type AnyPayload,
		type Container,
		isContainerWithPayloadType,
		type MeasurePayload,
		payloadTypes,
		type SimpleMeasurePayload
	} from '$lib/models';
	import { fetchContainersRelatedToMeasure } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<MeasurePayload | SimpleMeasurePayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let relatedContainersQuery = $derived(fetchContainersRelatedToMeasure(guid));

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<MeasureProperties
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

			<Sections bind:container {relatedContainers} />
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			{#if $applicationState.containerDetailView.editable && isContainerWithPayloadType(payloadTypes.enum.measure, container) && $ability.can('update', container)}
				<label>
					<input
						class="toggle"
						name="template"
						type="checkbox"
						bind:checked={container.payload.template}
					/>
					{$_('template')}
				</label>
			{/if}
			<RelationButton {container} />
			<CreateAnotherButton {container} {relatedContainers} />
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
