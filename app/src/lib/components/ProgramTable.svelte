<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Table from '$lib/components/Table.svelte';
	import {
		type Container,
		isGoalContainer,
		isKnowledgeContainer,
		isMeasureContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		predicates,
		type ProgramPayload,
		programTypes
	} from '$lib/models';

	interface Props {
		containers: Container[];
		program: Container<ProgramPayload>;
	}

	let { containers, program }: Props = $props();

	// The table lists the objects of the levels board plus the program's knowledge parts.
	let rows = $derived(
		containers.filter(
			(container) =>
				((isGoalContainer(container) || isKnowledgeContainer(container)) &&
					container.relation.some(
						({ object, predicate }) =>
							predicate === predicates.enum['is-part-of-program'] && object === program.guid
					)) ||
				isMeasureContainer(container) ||
				isSimpleMeasureContainer(container) ||
				isRuleContainer(container)
		)
	);

	let isGuide = $derived(program.payload.programType === programTypes.enum['program_type.guide']);

	let customCategoryColumns = $derived(
		page.data.categoryContext.keys.map((key) => ({
			heading: page.data.categoryContext.labels.get(key) ?? key,
			key
		}))
	);

	let columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('object'), key: 'type' },
		{ heading: $_('ai_contribution'), key: 'aiContribution' },
		...(isGuide ? [{ heading: $_('page'), key: 'aiSuggestionPageReference' }] : []),
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
		{ heading: $_('planned_duration'), key: 'duration' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
		{ heading: $_('goal_type'), key: 'objectType' }
	]);
</script>

<Table {columns} {rows} />
