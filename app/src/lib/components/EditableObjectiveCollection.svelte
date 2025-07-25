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
	<h3>{$_('objectives')}</h3>
	<EditableObjectiveCarousel container={parentContainer} {editable} {relatedContainers} />
{/if}

<style>
	h3 {
		margin: 0;
	}
</style>
