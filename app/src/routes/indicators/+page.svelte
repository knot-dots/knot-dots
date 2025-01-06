<script lang="ts">
	import { setContext } from 'svelte';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import IndicatorCategoryFilter from '$lib/components/IndicatorCategoryFilter.svelte';
	import IndicatorTypeFilter from '$lib/components/IndicatorTypeFilter.svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import IndicatorsIncludedFilter from '$lib/components/IndicatorsIncludedFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer, predicates } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-affected-by']]
	});
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if isOrganizationContainer(data.container)}
			<Sidebar helpSlug="indicators">
				<svelte:fragment slot="filters">
					<IndicatorTypeFilter />
					<AudienceFilter />
					<IndicatorCategoryFilter />
					<CategoryFilter />
					<TopicFilter />
				</svelte:fragment>
			</Sidebar>
		{:else if isOrganizationalUnitContainer(data.container)}
			<Sidebar helpSlug="indicators">
				<svelte:fragment slot="filters">
					<IndicatorTypeFilter />
					<AudienceFilter />
					<IndicatorsIncludedFilter />
					<IndicatorCategoryFilter />
					<CategoryFilter />
					<TopicFilter />
				</svelte:fragment>
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<Indicators containers={data.containers} />
	</svelte:fragment>
</Layout>
