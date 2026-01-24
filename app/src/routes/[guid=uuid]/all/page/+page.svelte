<script lang="ts">
	import type { Snippet } from 'svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';
	import { isContainerWithPayloadType, payloadTypes } from '$lib/models';

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

{#if isContainerWithPayloadType(payloadTypes.enum.organization, container)}
	<EditableOrganizationDetailView bind:container {layout} {relatedContainers} />
{:else if isContainerWithPayloadType(payloadTypes.enum.organizational_unit, container)}
	<EditableOrganizationalUnitDetailView bind:container {layout} {relatedContainers} />
{/if}
