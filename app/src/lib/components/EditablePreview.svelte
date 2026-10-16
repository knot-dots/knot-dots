<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Overlay from '~icons/knotdots/overlay';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import Badges from '$lib/components/Badges.svelte';
	import EditableNameOrTitle from '$lib/components/EditableNameOrTitle.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import PropertiesBar from '$lib/components/PropertiesBar.svelte';
	import Subsection from '$lib/components/Subsection.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		isContainerWithBody,
		isContainerWithDescription,
		isGoalCollectionContainer,
		isObjectiveCollectionContainer,
		isResourceCollectionContainer,
		isSimpleMeasureContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import { hasSection } from '$lib/relations';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		relatedContainers: Array<Container<AnyPayload>>;
	}

	let { container = $bindable(), editable = false, heading, relatedContainers }: Props = $props();

	let subsections = $derived(
		hasSection(container, relatedContainers).filter(
			(s) =>
				isGoalCollectionContainer(s) ||
				isObjectiveCollectionContainer(s) ||
				isResourceCollectionContainer(s)
		)
	);

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

<form oninput={stopPropagation(requestSubmit)} onsubmit={autoSave(container, 2000)}>
	<svelte:element this={heading} class="details-heading">
		<EditableNameOrTitle bind:container {editable} />
	</svelte:element>

	{#if createFeatureDecisions(page.data.features).useNewPropertyPanel()}
		<PropertiesBar bind:container {editable} revisions={[]} />
	{:else}
		<Badges bind:container {editable} />
	{/if}

	{#if isSimpleMeasureContainer(container)}
		<EditableProgress {editable} bind:value={container.payload.progress} />
	{/if}

	{#if isContainerWithBody(container)}
		{#if editable}
			<Editor bind:value={container.payload.body} />
		{:else}
			<Viewer value={container.payload.body} />
		{/if}
	{/if}

	{#if isContainerWithDescription(container)}
		{#if editable}
			<Editor bind:value={container.payload.description} />
		{:else}
			<Viewer value={container.payload.description} />
		{/if}
	{/if}
</form>

{#each subsections as { guid }, i (guid)}
	<Subsection
		bind:container={subsections[i]}
		bind:parentContainer={container}
		bind:relatedContainers
		{editable}
	/>
{/each}

<footer>
	<a
		class="button button-alternate-outline button-xs"
		href={overlayURL(page.url, overlayKey.enum.view, container.guid)}
	>
		<Overlay />
		{$_('open_in_overlay')}
	</a>
</footer>

<style>
	form {
		display: contents;
	}

	.details-heading {
		color: var(--color-gray-800);
		font-size: 1.875rem;
	}

	footer {
		margin-top: 1rem;
	}
</style>
