<script lang="ts">
	import { setContext } from 'svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isGoalContainer,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isTaskContainer,
		predicates
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: measures = data.containers.filter(isMeasureContainer);

	$: goals = data.containers
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
		);

	$: tasks = data.containers
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
	<svelte:fragment slot="main">
		<MeasureMonitoring
			{measures}
			containers={data.containers.filter(isMeasureMonitoringContainer)}
			indicators={data.containers.filter(isIndicatorContainer)}
			showMeasures
		/>
	</svelte:fragment>
</Layout>
