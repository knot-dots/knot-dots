<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import { type AnyContainer, isContainer, type ObjectiveCollectionContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: ObjectiveCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers));
</script>

{#if parentContainer && isContainer(parentContainer)}
	<header>
		<h2 class="details-heading">{$_('objectives')}</h2>

		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:relatedContainers />
				</li>
			</ul>
		{/if}
	</header>

	<EditableObjectiveCarousel container={parentContainer} {editable} {relatedContainers} />
{/if}
