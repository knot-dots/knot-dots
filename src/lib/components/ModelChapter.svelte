<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import type { Container, ModelContainer } from '$lib/models';
	import { isPartOf, isStrategicGoalGoalContainer } from '$lib/models';
	import StrategicGoalChapter from '$lib/components/StrategicGoalChapter.svelte';

	export let container: ModelContainer;
	export let relatedContainers: Container[] = [];

	$: parts = relatedContainers.filter(isStrategicGoalGoalContainer).filter(isPartOf(container));
</script>

<Chapter {container} />
{#each parts as p}
	<StrategicGoalChapter container={p} {relatedContainers} />
{/each}
