<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import {
		audience,
		computeFacetCount,
		fromCounts,
		measureTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];

	let facets = $derived.by(() => {
		const facets = new Map([
			['audience', fromCounts(audience.options, data.facets.audience)],
			['category', fromCounts(sustainableDevelopmentGoals.options, data.facets.category)],
			['topic', fromCounts(topics.options, data.facets.topic)],
			['policyFieldBNK', fromCounts(policyFieldBNK.options, data.facets.policyFieldBNK)],
			['measureType', fromCounts(measureTypes.options, data.facets.measureType)]
		]);

		if (Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, data.containers);
		}

		return facets;
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search {workspaceOptions} />
	{/snippet}

	{#snippet main()}
		<Measures containers={data.containers} />
		<Help slug="measures-status" />
	{/snippet}
</Layout>
