<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import { isOperationalGoalContainer, predicates } from '$lib/models';
	import type { Container, OperationalGoalContainer, StrategicGoalContainer } from '$lib/models';
	import OperationalGoalChapter from '$lib/components/OperationalGoalChapter.svelte';

	export let container: StrategicGoalContainer;
	export let relatedContainers: Container[] = [];

	$: parts = container.relation
		.filter(
			({ object, predicate, subject }) =>
				predicate == predicates.enum['is-part-of'] &&
				relatedContainers.find((r) => r.revision == subject) &&
				'revision' in container &&
				object == container.revision
		)
		.map(
			({ subject }) =>
				relatedContainers.find((r) => r.revision == subject) as OperationalGoalContainer
		);
</script>

<Chapter {container} />
{#each parts as p}
	{#if isOperationalGoalContainer(p)}
		<OperationalGoalChapter container={p} {relatedContainers} />
	{:else}
		<Chapter container={p} />
	{/if}
{/each}
