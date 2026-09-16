<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CodeMerge from '~icons/flowbite/code-merge-outline';
	import createCreationTemplateAvailability from '$lib/client/createCreationTemplateAvailability.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		getDirectProgramGuids,
		isProgramContainer,
		isTaskContainer,
		type NewContainer,
		payloadTypes,
		type PayloadType,
		predicates
	} from '$lib/models';
	import { ability, applicationState, newContainer } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, relatedContainers }: Props = $props();

	let program = $derived.by(() => {
		if (isProgramContainer(container)) {
			return container;
		}
		const [programGuid] = getDirectProgramGuids(container);
		return relatedContainers.filter(isProgramContainer).find(({ guid }) => guid === programGuid);
	});

	const templateAvailability = createCreationTemplateAvailability(
		() => createDraft(container, payloadTypes.enum.goal),
		() => program?.payload.chapterType ?? [payloadTypes.enum.goal, payloadTypes.enum.task]
	);

	let options = $derived.by(() => {
		let options: { label: string; value: string }[] = [];

		const isPartOfProgramRelation = container.relation.find(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-program'] && subject === container.guid
		);

		const isPartOfMeasureRelation = container.relation.find(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] && subject === container.guid
		);

		if (isProgramContainer(container)) {
			options = [...container.payload.chapterType]
				.filter((type) => type === payloadTypes.enum.text || templateAvailability.has(type))
				.map((p) => ({ label: $_(p), value: p }));
		} else if (isPartOfProgramRelation) {
			options = [...(program?.payload.chapterType ?? [])]
				.filter((type) => type === payloadTypes.enum.text || templateAvailability.has(type))
				.map((p) => ({ label: $_(p), value: p }));
		} else if (isPartOfMeasureRelation) {
			options = [payloadTypes.enum.goal, payloadTypes.enum.task]
				.filter((type) => templateAvailability.has(type))
				.map((p) => ({
					label: $_(p),
					value: p
				}));
		}

		return options;
	});

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createDraft(container: Container<AnyPayload>, type: PayloadType) {
		const derived = containerOfType(
			type,
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
			...('category' in container.payload && 'category' in derived.payload
				? { category: container.payload.category }
				: undefined),
			...('status' in container.payload && 'status' in derived.payload
				? { status: container.payload.status }
				: undefined),
			...('taskCategory' in container.payload && 'taskCategory' in derived.payload
				? { taskCategory: container.payload.taskCategory }
				: undefined),
			...('visibility' in container.payload && 'visibility' in derived.payload
				? { visibility: container.payload.visibility }
				: undefined)
		};

		const isPartOfProgramRelations = container.relation.filter(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-program'] && subject === container.guid
		);

		const isPartOfMeasureRelation = container.relation.find(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] && subject === container.guid
		);

		if (isProgramContainer(container)) {
			derived.relation = [
				{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			];
		} else if (isPartOfProgramRelations.length > 0) {
			// The derived container joins every program of the original, right
			// after it in each program's ordering.
			derived.relation = isPartOfProgramRelations.map(({ object, position }) => ({
				object,
				position: position + 1,
				predicate: predicates.enum['is-part-of-program']
			}));
		} else if (isPartOfMeasureRelation) {
			derived.relation = [
				{
					object: isPartOfMeasureRelation.object,
					position: 0,
					predicate: predicates.enum['is-part-of-measure']
				}
			];
		}

		return derived;
	}

	function createHandler(container: Container<AnyPayload>) {
		return (event: Event) => {
			const selected = (event as CustomEvent).detail.selected as PayloadType | undefined;
			if (!selected || !templateAvailability.has(selected)) return;
			$newContainer = createDraft(container, selected);
			createContainerDialog.getElement().showModal();
		};
	}

	function mayDeriveFrom(container: Container<AnyPayload>) {
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

{#if $applicationState.containerDetailView.editable && $ability.can('create', container) && mayDeriveFrom(container) && options.length > 0}
	<DropDownMenu label={$_('create_another')} {options} handleChange={createHandler(container)}>
		{#snippet icon()}<CodeMerge />{/snippet}
	</DropDownMenu>
{/if}
