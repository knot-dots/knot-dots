<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import { type AnyContainer, isContainer, type ObjectiveCollectionContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: ObjectiveCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers }: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers));
</script>

{#if parentContainer && isContainer(parentContainer)}
	<h2 class="details-heading">{$_('objectives')}</h2>
	<EditableObjectiveCarousel container={parentContainer} {editable} {relatedContainers} />
{/if}
