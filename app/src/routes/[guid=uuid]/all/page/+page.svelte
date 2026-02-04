<script lang="ts">
	import type { Snippet } from 'svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived.by(() => {
		let _ = $state(data.container);
		return _;
	});

	let relatedContainers = $derived(data.relatedContainers);
</script>

{#snippet layout(header: Snippet, main: Snippet)}
	<Layout {header} {main} />
{/snippet}

{#if isOrganizationContainer(container)}
	<EditableOrganizationDetailView {container} {layout} {relatedContainers} />
{:else if isOrganizationalUnitContainer(container)}
	<EditableOrganizationalUnitDetailView {container} {layout} {relatedContainers} />
{/if}
