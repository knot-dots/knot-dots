<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import type { Container, ModelContainer } from '$lib/models';
	import { isPartOf, isStrategicGoalGoalContainer, isTextContainer } from '$lib/models';
	import StrategicGoalChapter from '$lib/components/StrategicGoalChapter.svelte';

	export let container: ModelContainer;
	export let relatedContainers: Container[] = [];

	$: parts = relatedContainers
		.filter((c) => isStrategicGoalGoalContainer(c) || isTextContainer(c))
		.filter(isPartOf(container));
</script>

<Chapter {container} />
{#each parts as p}
	{#if isStrategicGoalGoalContainer(p)}
		<StrategicGoalChapter container={p} {relatedContainers} />
	{:else}
		<Chapter container={p} />
	{/if}
{/each}
