<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import { isOperationalGoalContainer, predicates } from '$lib/models';
	import type {
		Container,
		ModelContainer,
		OperationalGoalContainer,
		StrategicGoalContainer
	} from '$lib/models';
	import OperationalGoalChapter from '$lib/components/OperationalGoalChapter.svelte';

	export let chapter = '';
	export let container: StrategicGoalContainer;
	export let isPartOf: ModelContainer;
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

<Chapter {chapter} {container} {isPartOf} />
{#each parts as p, i}
	{#if isOperationalGoalContainer(p)}
		<OperationalGoalChapter
			chapter={`${chapter}.${i + 1}`}
			container={p}
			isPartOf={container}
			{relatedContainers}
		/>
	{:else}
		<Chapter chapter={`${chapter}.${i + 1}`} container={p} isPartOf={container} />
	{/if}
{/each}
