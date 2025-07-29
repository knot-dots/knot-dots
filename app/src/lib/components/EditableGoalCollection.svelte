<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
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
	<header>
		<h2 class="details-heading">{$_('goals')}</h2>

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
		payloadType={payloadTypes.enum.goal}
		{relatedContainers}
	/>
{/if}
