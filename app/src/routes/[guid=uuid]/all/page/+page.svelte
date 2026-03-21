<script lang="ts">
	import type { Snippet } from 'svelte';
	import { autoSaveContainer } from '$lib/autoSaveContainer.svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived(autoSaveContainer(data.container, 2000, data.container.payload.type));

	let relatedContainers = $derived(data.relatedContainers);

	let linkedProfiles = $derived(data.linkedProfiles ?? []);
</script>

{#snippet layout(header: Snippet, main: Snippet)}
	<Layout {header} {main} />
{/snippet}

{#if isOrganizationContainer(container)}
	<EditableOrganizationDetailView bind:container {layout} {relatedContainers} />
{:else if isOrganizationalUnitContainer(container)}
	<EditableOrganizationalUnitDetailView
		bind:container
		{layout}
		{linkedProfiles}
		{relatedContainers}
	/>
{/if}
