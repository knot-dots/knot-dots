<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import { isPartOf, isOperationalGoalContainer, isTextContainer } from '$lib/models';
	import type { Container, StrategicGoalContainer } from '$lib/models';
	import OperationalGoalChapter from '$lib/components/OperationalGoalChapter.svelte';

	export let container: StrategicGoalContainer;
	export let relatedContainers: Container[] = [];

	$: parts = relatedContainers
		.filter((c) => isOperationalGoalContainer(c) || isTextContainer(c))
		.filter(isPartOf(container));
</script>

<Chapter {container} />
{#each parts as p}
	{#if isOperationalGoalContainer(p)}
		<OperationalGoalChapter container={p} {relatedContainers} />
	{:else}
		<Chapter container={p} />
	{/if}
{/each}
