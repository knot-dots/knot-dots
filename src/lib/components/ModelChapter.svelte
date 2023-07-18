<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import type {
		Container,
		ModelContainer,
		StrategicGoalContainer,
		StrategyContainer
	} from '$lib/models';
	import { isStrategicGoalGoalContainer, predicates } from '$lib/models';
	import StrategicGoalChapter from '$lib/components/StrategicGoalChapter.svelte';

	export let headingTag: string;
	export let container: ModelContainer;
	export let isPartOf: StrategyContainer;
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

<Chapter {container} {headingTag} {isPartOf} />
{#each parts as p, i}
	{#if isStrategicGoalGoalContainer(p)}
		<StrategicGoalChapter container={p} headingTag="h4" isPartOf={container} {relatedContainers} />
	{:else}
		<Chapter container={p} headingTag="h4" isPartOf={container} />
	{/if}
{/each}
