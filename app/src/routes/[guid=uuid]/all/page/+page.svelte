<script lang="ts">
	import type { Snippet } from 'svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#snippet layout(header: Snippet, main: Snippet)}
	<Layout {header} {main} />
{/snippet}

{#if isOrganizationContainer(data.container)}
	<EditableOrganizationDetailView
		container={data.container}
		{layout}
		relatedContainers={data.relatedContainers}
	/>
{:else if isOrganizationalUnitContainer(data.container)}
	<EditableOrganizationalUnitDetailView
		container={data.container}
		{layout}
		relatedContainers={data.relatedContainers}
	/>
{/if}
