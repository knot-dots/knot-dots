<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import {
		type AnyContainer,
		isContainer,
		type MeasureContainer,
		payloadTypes,
		type ResourceCollectionContainer
	} from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: ResourceCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers)) as MeasureContainer;
</script>

{#if parentContainer && isContainer(parentContainer)}
	<h3>{$_('resources')}</h3>
	<EditablePartOfMeasureCarousel
		container={parentContainer}
		{editable}
		payloadType={payloadTypes.enum.resource}
		{relatedContainers}
	/>
{/if}

<style>
	h3 {
		margin: 0;
	}
</style>
