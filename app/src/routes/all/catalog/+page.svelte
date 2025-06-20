<script lang="ts">
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import {
		isGoalContainer,
		isMeasureContainer,
		isResolutionContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		payloadTypes
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AllPage {data}>
	<Catalog
		containers={data.containers
			.filter(
				(c) =>
					isGoalContainer(c) ||
					isMeasureContainer(c) ||
					isResolutionContainer(c) ||
					isSimpleMeasureContainer(c) ||
					isStrategyContainer(c)
			)
			.slice(0, browser ? undefined : 20)}
		payloadType={[
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure,
			payloadTypes.enum.strategy
		]}
	/>
	<Help slug="all-catalog" />
</AllPage>
