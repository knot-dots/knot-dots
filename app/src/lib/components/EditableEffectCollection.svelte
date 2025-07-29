<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableEffectCarousel from '$lib/components/EditableEffectCarousel.svelte';
	import { type AnyContainer, type EffectCollectionContainer, isContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: EffectCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers }: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers));
</script>

{#if parentContainer && isContainer(parentContainer)}
	<h2 class="details-heading">{$_('effects')}</h2>
	<EditableEffectCarousel container={parentContainer} {editable} {relatedContainers} />
{/if}
