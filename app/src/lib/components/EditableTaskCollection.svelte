<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import { type AnyContainer, isContainer, type TaskCollectionContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: TaskCollectionContainer;
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
		<h2 class="details-heading">{$_('tasks')}</h2>

		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:relatedContainers />
				</li>
			</ul>
		{/if}
	</header>

	<EditableTaskCarousel container={parentContainer} {editable} />
{/if}
