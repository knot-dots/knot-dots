<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		containersByHierarchyLevel,
		isContainerWithPayloadType,
		overlayKey,
		payloadTypes,
		predicates,
		type ProgramPayload,
		titleForGoalCollection,
		titleForMeasureCollection
	} from '$lib/models';

	interface Props {
		containers: Container[];
		program?: Container<ProgramPayload>;
	}

	let { containers, program }: Props = $props();

	let goals = $derived(
		containersByHierarchyLevel(
			containers
				.filter((c) => isContainerWithPayloadType(payloadTypes.enum.goal, c))
				.filter(({ relation }) =>
					relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
				)
		)
	);

	let measuresAndRules = $derived(
		containersByHierarchyLevel(
			containers.filter(
				(c) =>
					isContainerWithPayloadType(payloadTypes.enum.measure, c) ||
					isContainerWithPayloadType(payloadTypes.enum.simple_measure, c) ||
					isContainerWithPayloadType(payloadTypes.enum.rule, c)
			)
		)
	);

	let columns = $derived([
		...Array.from(goals.entries()).map(([hierarchyLevel, containers]) => ({
			addItemUrl: addItemUrl([
				[overlayKey.enum.create, payloadTypes.enum.goal],
				['hierarchyLevel', String(hierarchyLevel)],
				...(program
					? [
							[predicates.enum['is-part-of-program'], program.guid],
							['managedBy', program.managed_by]
						]
					: [])
			]),
			containers,
			key: `goals-${hierarchyLevel}`,
			title: titleForGoalCollection(containers, [...goals.keys()].length > 1 ? hierarchyLevel : 0)
		})),
		...Array.from(measuresAndRules.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => {
				if (hierarchyLevel === 1) {
					return {
						addItemUrl: addItemUrl([
							[overlayKey.enum.create, payloadTypes.enum.measure],
							[overlayKey.enum.create, payloadTypes.enum.simple_measure],
							[overlayKey.enum.create, payloadTypes.enum.rule],
							['hierarchyLevel', String(hierarchyLevel)],
							...(program
								? [
										[predicates.enum['is-part-of-program'], program.guid],
										['managedBy', program.managed_by]
									]
								: [])
						]),
						containers,
						key: `implementation-${hierarchyLevel}`,
						title: titleForMeasureCollection(
							containers.filter((c) => isContainerWithPayloadType(payloadTypes.enum.measure, c)),
							[...measuresAndRules.keys()].length > 1 ? hierarchyLevel : 0
						)
					};
				} else {
					return {
						addItemUrl: addItemUrl([
							[overlayKey.enum.create, payloadTypes.enum.measure],
							['hierarchyLevel', String(hierarchyLevel)],
							...(program
								? [
										[predicates.enum['is-part-of-program'], program.guid],
										['managedBy', program.managed_by]
									]
								: [])
						]),
						containers,
						key: `implementation-${hierarchyLevel}`,
						title: titleForMeasureCollection(
							containers.filter((c) => isContainerWithPayloadType(payloadTypes.enum.measure, c)),
							hierarchyLevel
						)
					};
				}
			})
	]);

	function addItemUrl(init: string[][]) {
		const params = new URLSearchParams(init);
		return `#${params.toString()}`;
	}
</script>

<Board>
	{#each columns as column (column.key)}
		<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
			<div class="vertical-scroll-wrapper">
				{#each column.containers as container (container.guid)}
					<Card {container} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
