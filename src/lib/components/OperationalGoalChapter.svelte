<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import { isPartOf, isMeasureContainer, isTextContainer } from '$lib/models';
	import type { Container, OperationalGoalContainer } from '$lib/models';

	export let container: OperationalGoalContainer;
	export let relatedContainers: Container[] = [];

	$: parts = relatedContainers
		.filter((c) => isMeasureContainer(c) || isTextContainer(c))
		.filter(isPartOf(container));
</script>

<Chapter {container} />
{#each parts as p}
	<Chapter container={p} />
{/each}
