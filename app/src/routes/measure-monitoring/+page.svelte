<script lang="ts">
	import { setContext } from 'svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import {
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isMilestoneContainer,
		isTaskContainer,
		predicates
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: measures = data.containers.filter(isMeasureContainer);

	$: milestones = data.containers
		.filter(isMilestoneContainer)
		.filter(
			({ relation }) =>
				relation.findIndex(
					(r) =>
						(r.predicate === predicates.enum['is-part-of'] &&
							measures.map(({ guid }) => guid).includes(r.object)) ||
						(r.predicate === predicates.enum['is-part-of-measure'] &&
							measures.map(({ guid }) => guid).includes(r.object))
				) > -1
		);

	$: tasks = data.containers
		.filter(isTaskContainer)
		.filter(
			({ relation }) =>
				relation.findIndex(
					(r) =>
						(r.predicate === predicates.enum['is-part-of'] &&
							milestones.map(({ guid }) => guid).includes(r.object)) ||
						(r.predicate === predicates.enum['is-part-of-measure'] &&
							measures.map(({ guid }) => guid).includes(r.object))
				) > -1
		);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-duplicate-of']
		]
	});
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="measure-monitoring">
			<Search slot="search" />

			<svelte:fragment slot="filters">
				<OrganizationIncludedFilter />
				<CategoryFilter />
				<TopicFilter />
				<PolicyFieldBNKFilter />
			</svelte:fragment>

			<Sort slot="sort" />
		</Sidebar>
	</svelte:fragment>

	<svelte:fragment slot="main">
		<MeasureMonitoring
			{measures}
			containers={data.containers.filter(isMeasureMonitoringContainer)}
			indicators={data.containers.filter(isIndicatorContainer)}
			showMeasures
		/>
	</svelte:fragment>
</Layout>
