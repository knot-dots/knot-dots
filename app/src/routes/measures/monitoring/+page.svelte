<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		isGoalContainer,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isTaskContainer,
		predicates
	} from '$lib/models';
	import type { PageProps } from './$types';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';

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
</script>

<MeasuresPage {data}>
	<MeasureMonitoring
		{measures}
		containers={data.containers.filter(isMeasureMonitoringContainer)}
		indicators={data.containers.filter(isIndicatorContainer)}
		showMeasures
	/>
	<Help slug="measures-monitoring" />
</MeasuresPage>
