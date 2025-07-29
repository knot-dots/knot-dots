<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
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
	<header>
		<h2 class="details-heading">{$_('resources')}</h2>

		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:relatedContainers />
				</li>
			</ul>
		{/if}
	</header>

	<EditablePartOfMeasureCarousel
		container={parentContainer}
		{editable}
		payloadType={payloadTypes.enum.resource}
		{relatedContainers}
	/>
{/if}
