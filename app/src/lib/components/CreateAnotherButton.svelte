<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CodeMerge from '~icons/flowbite/code-merge-outline';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import {
		type AnyContainer,
		type Container,
		containerOfType,
		isProgramContainer,
		isTaskContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { ability, newContainer } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: Container[];
	}

	let { container, relatedContainers }: Props = $props();

	let options = $derived.by(() => {
		let options: { label: string; value: string }[] = [];

		const isPartOfProgramRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-program']
		);

		const isPartOfMeasureRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		);

		if (isProgramContainer(container)) {
			options = [...container.payload.chapterType].map((p) => ({ label: $_(p), value: p }));
		} else if (isPartOfProgramRelation) {
			const program = relatedContainers
				.filter(isProgramContainer)
				.find(({ relation }) =>
					relation.some(
						({ predicate, object }) =>
							object == isPartOfProgramRelation.object &&
							predicate == isPartOfProgramRelation.predicate
					)
				);
			options = [...(program?.payload.chapterType ?? [])].map((p) => ({ label: $_(p), value: p }));
		} else if (isPartOfMeasureRelation) {
			options = [payloadTypes.enum.goal, payloadTypes.enum.task].map((p) => ({
				label: $_(p),
				value: p
			}));
		}

		return options;
	});

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createHandler(container: AnyContainer) {
		return (event: Event) => {
			if (!(event as CustomEvent).detail.selected) {
				return;
			}

			const derived = containerOfType(
				(event as CustomEvent).detail.selected,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;

			derived.payload = {
				...derived.payload,
				...('assignee' in container.payload && isTaskContainer(derived)
					? { assignee: container.payload.assignee }
					: undefined),
				...('audience' in container.payload && 'audience' in derived.payload
					? { audience: container.payload.audience }
					: undefined),
				...('category' in container.payload && 'category' in derived.payload
					? { category: container.payload.category }
					: undefined),
				...('ruleStatus' in container.payload && 'ruleStatus' in derived.payload
					? { ruleStatus: container.payload.ruleStatus }
					: undefined),
				...('status' in container.payload && 'status' in derived.payload
					? { status: container.payload.status }
					: undefined),
				...('taskCategory' in container.payload && 'taskCategory' in derived.payload
					? { taskCategory: container.payload.taskCategory }
					: undefined),
				...('taskStatus' in container.payload && 'taskStatus' in derived.payload
					? { taskStatus: container.payload.taskStatus }
					: undefined),
				...('topic' in container.payload && 'topic' in derived.payload
					? { topic: container.payload.topic }
					: undefined),
				...('visibility' in container.payload && 'visibility' in derived.payload
					? { visibility: container.payload.visibility }
					: undefined)
			};

			const isPartOfProgramRelation = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-program']
			);

			const isPartOfMeasureRelation = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-measure']
			);

			if (isProgramContainer(container)) {
				derived.relation = [
					{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
				];
			} else if (isPartOfProgramRelation) {
				derived.relation = [
					{
						object: isPartOfProgramRelation.object,
						position: isPartOfProgramRelation.position + 1,
						predicate: predicates.enum['is-part-of-program']
					}
				];
			} else if (isPartOfMeasureRelation) {
				derived.relation = [
					{
						object: isPartOfMeasureRelation.object,
						position: 0,
						predicate: predicates.enum['is-part-of-measure']
					}
				];
			}

			$newContainer = derived;

			createContainerDialog.getElement().showModal();
		};
	}

	function mayDeriveFrom(container: AnyContainer) {
		return (
			isProgramContainer(container) ||
			container.relation
				.filter(({ object }) => object !== container.guid)
				.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-program'] ||
						predicate === predicates.enum['is-part-of-measure']
				)
		);
	}
</script>

{#if $ability.can('create', payloadTypes.enum.undefined) && mayDeriveFrom(container)}
	<DropDownMenu label={$_('create_another')} {options} handleChange={createHandler(container)}>
		{#snippet icon()}<CodeMerge />{/snippet}
	</DropDownMenu>
{/if}
