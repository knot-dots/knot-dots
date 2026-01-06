<script lang="ts">
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import {
		isGoalContainer,
		isMeasureContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		isProgramContainer,
		payloadTypes
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AllPage {data} filtersInitiallyOpened>
	<Catalog
		containers={data.containers
			.filter(
				(c) =>
					isGoalContainer(c) ||
					isMeasureContainer(c) ||
					isRuleContainer(c) ||
					isSimpleMeasureContainer(c) ||
					isProgramContainer(c)
			)
			.slice(0, browser ? undefined : 20)}
		payloadType={[
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure,
			payloadTypes.enum.program
		]}
	/>
	<Help slug="all-catalog" />
</AllPage>
