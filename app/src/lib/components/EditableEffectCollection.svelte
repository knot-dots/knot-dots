<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableEffectCarousel from '$lib/components/EditableEffectCarousel.svelte';
	import { type AnyContainer, type EffectCollectionContainer, isContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: EffectCollectionContainer;
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
		<h2 class="details-heading">{$_('effects')}</h2>

		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:relatedContainers />
				</li>
			</ul>
		{/if}
	</header>

	<EditableEffectCarousel container={parentContainer} {editable} {relatedContainers} />
{/if}
