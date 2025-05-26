<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		audience,
		computeFacetCount,
		isGoalContainer,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isTaskContainer,
		measureTypes,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let measures = $derived(data.containers.filter(isMeasureContainer));

	let goals = $derived(
		data.containers
			.filter(isGoalContainer)
			.filter(
				({ relation }) =>
					relation.findIndex(
						(r) =>
							(r.predicate === predicates.enum['is-part-of'] &&
								measures.map(({ guid }) => guid).includes(r.object)) ||
							(r.predicate === predicates.enum['is-part-of-measure'] &&
								measures.map(({ guid }) => guid).includes(r.object))
					) > -1
			)
	);

	let tasks = $derived(
		data.containers
			.filter(isTaskContainer)
			.filter(
				({ relation }) =>
					relation.findIndex(
						(r) =>
							(r.predicate === predicates.enum['is-part-of'] &&
								goals.map(({ guid }) => guid).includes(r.object)) ||
							(r.predicate === predicates.enum['is-part-of-measure'] &&
								measures.map(({ guid }) => guid).includes(r.object))
					) > -1
			)
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

	let facets = $derived.by(() => {
		const facets = new Map([
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Header {facets} search slot="header" />

	<svelte:fragment slot="main">
		<MeasureMonitoring
			{measures}
			containers={data.containers.filter(isMeasureMonitoringContainer)}
			indicators={data.containers.filter(isIndicatorContainer)}
			showMeasures
		/>
		<Help slug="measure-monitoring" />
	</svelte:fragment>
</Layout>
