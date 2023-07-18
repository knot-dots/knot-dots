<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import { predicates } from '$lib/models';
	import type {
		Container,
		MeasureContainer,
		OperationalGoalContainer,
		StrategicGoalContainer
	} from '$lib/models';

	export let headingTag: string;
	export let container: OperationalGoalContainer;
	export let isPartOf: StrategicGoalContainer;
	export let relatedContainers: Container[] = [];

	$: parts = container.relation
		.filter(
			({ object, predicate, subject }) =>
				predicate == predicates.enum['is-part-of'] &&
				relatedContainers.find((r) => r.revision == subject) &&
				'revision' in container &&
				object == container.revision
		)
		.map(({ subject }) => relatedContainers.find((r) => r.revision == subject) as MeasureContainer);
</script>

<Chapter {container} {headingTag} {isPartOf} />
{#each parts as p, i}
	<Chapter container={p} headingTag="h6" isPartOf={container} />
{/each}
