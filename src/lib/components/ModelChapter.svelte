<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import type { Container, ModelContainer, StrategicGoalContainer } from '$lib/models';
	import { isStrategicGoalGoalContainer, predicates } from '$lib/models';
	import StrategicGoalChapter from '$lib/components/StrategicGoalChapter.svelte';

	export let container: ModelContainer;
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
				relatedContainers.find((r) => r.revision == subject) as StrategicGoalContainer
		);
</script>

<Chapter {container} />
{#each parts as p}
	{#if isStrategicGoalGoalContainer(p)}
		<StrategicGoalChapter container={p} {relatedContainers} />
	{:else}
		<Chapter container={p} />
	{/if}
{/each}
