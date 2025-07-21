<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import {
		type AnyContainer,
		isContainer,
		type GoalCollectionContainer,
		type MeasureContainer,
		payloadTypes
	} from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: GoalCollectionContainer;
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
	<h3>{$_('goals')}</h3>
	<EditablePartOfMeasureCarousel
		container={parentContainer}
		{editable}
		payloadType={payloadTypes.enum.goal}
		{relatedContainers}
	/>
{/if}

<style>
	h3 {
		margin: 0;
	}
</style>
