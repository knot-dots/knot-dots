<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import { isPartOf, isOperationalGoalContainer } from '$lib/models';
	import type { Container, StrategicGoalContainer } from '$lib/models';
	import OperationalGoalChapter from '$lib/components/OperationalGoalChapter.svelte';

	export let container: StrategicGoalContainer;
	export let relatedContainers: Container[] = [];

	$: parts = relatedContainers.filter(isOperationalGoalContainer).filter(isPartOf(container));
</script>

<Chapter {container} />
{#each parts as p}
	<OperationalGoalChapter container={p} {relatedContainers} />
{/each}
