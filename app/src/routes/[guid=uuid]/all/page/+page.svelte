<script lang="ts">
	import type { Snippet } from 'svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived.by(() => {
		let _ = $state(data.container);
		return _;
	});

	let linkedProfiles = $derived(data.linkedProfiles ?? []);

	let relatedOrganizationalUnitGuids = $derived(data.relatedOrganizationalUnitGuids ?? []);

	let sections = $derived(data.sections ?? []);
</script>

{#snippet layout(header: Snippet, content: Snippet)}
	<Layout {header}>
		{#snippet main()}
			<div>{@render content()}</div>
		{/snippet}
	</Layout>
{/snippet}

<PageLayout>
	{#if isOrganizationContainer(container)}
		<EditableOrganizationDetailView bind:container {layout} {sections} />
	{:else if isOrganizationalUnitContainer(container)}
		<EditableOrganizationalUnitDetailView
			bind:container
			{layout}
			{linkedProfiles}
			{relatedOrganizationalUnitGuids}
			{sections}
		/>
	{/if}
</PageLayout>

<style>
	div {
		display: flex;
		flex: 1 0 100%;
		flex-direction: column;
		max-height: 100%;
	}
</style>
