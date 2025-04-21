<script lang="ts">
	import { getContext, hasContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import AskAI from '~icons/knotdots/ask-ai';
	import CopyCat from '~icons/knotdots/copycat';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import createObjective from '$lib/client/createObjective';
	import deleteContainer from '$lib/client/deleteContainer';
	import saveContainer from '$lib/client/saveContainer';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ContainerDetailViewTabs from '$lib/components/ContainerDetailViewTabs.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EffectDetailView from '$lib/components/EffectDetailView.svelte';
	import IndicatorDetailView from '$lib/components/IndicatorDetailView.svelte';
	import IndicatorTabs from '$lib/components/IndicatorTabs.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureResultDetailView from '$lib/components/MeasureResultDetailView.svelte';
	import ObjectiveDetailView from '$lib/components/ObjectiveDetailView.svelte';
	import PayloadTypeFilter from '$lib/components/PayloadTypeFilter.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import ResolutionDetailView from '$lib/components/ResolutionDetailView.svelte';
	import ResourceDetailView from '$lib/components/ResourceDetailView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyViewModes from '$lib/components/StrategyViewModes.svelte';
	import TaskDetailView from '$lib/components/TaskDetailView.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		type Container,
		containerOfType,
		findOverallObjective,
		type IndicatorContainer,
		isContainer,
		isContainerWithEffect,
		isEffectContainer,
		isIndicatorContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		isModelContainer,
		isObjectiveContainer,
		isOperationalGoalContainer,
		isOrganizationalUnitContainer,
		isResolutionContainer,
		isResourceContainer,
		isStrategicGoalContainer,
		isStrategyContainer,
		isTaskContainer,
		isTextContainer,
		isVisionContainer,
		type NewContainer,
		newIndicatorTemplateFromIndicator,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates,
		quantities,
		type StrategyContainer
	} from '$lib/models';
	import {
		ability,
		applicationState,
		mayDeleteContainer,
		newContainer,
		overlayHistory,
		user
	} from '$lib/stores';

	export let container: AnyContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[] = [];

	let mayShowRelationButton =
		hasContext('relationOverlay') &&
		(getContext('relationOverlay') as { enabled: boolean }).enabled;
	let saveAsIndicatorTemplateDisabled = false;

	function saveIndicatorAsTemplate(c: IndicatorContainer) {
		return async () => {
			saveAsIndicatorTemplateDisabled = true;
			await saveContainer(newIndicatorTemplateFromIndicator(c));
		};
	}

	function mayDeriveFrom(container: AnyContainer) {
		return (
			isStrategyContainer(container) ||
			container.relation
				.filter(({ object }) => object !== container.guid)
				.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-strategy'] ||
						predicate === predicates.enum['is-part-of-measure']
				)
		);
	}

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	let createAnotherOptions: { label: string; value: string }[] = [];

	$: {
		const isPartOfStrategyRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
		);
		const isPartOfMeasureRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		);

		if (isStrategyContainer(container)) {
			createAnotherOptions = [...container.payload.chapterType].map((p) => ({
				label: $_(p),
				value: p
			}));
		} else if (isPartOfStrategyRelation) {
			const strategy = relatedContainers
				.filter(isStrategyContainer)
				.find(({ relation }) =>
					relation.some(
						({ predicate, object }) =>
							object == isPartOfStrategyRelation.object &&
							predicate == isPartOfStrategyRelation.predicate
					)
				);
			createAnotherOptions = [...(strategy?.payload.chapterType ?? [])].map((p) => ({
				label: $_(p),
				value: p
			}));
		} else if (isPartOfMeasureRelation) {
			createAnotherOptions = [
				payloadTypes.enum.measure_result,
				payloadTypes.enum.milestone,
				payloadTypes.enum.task
			].map((p) => ({ label: $_(p), value: p }));
		}
	}

	async function createAnother(container: AnyContainer) {
		const isPartOfStrategyRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
		);
		const isPartOfMeasureRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		);

		const params = new URLSearchParams();
		params.append(overlayKey.enum.create, 'undefined');

		if (isStrategyContainer(container)) {
			params.append(predicates.enum['is-part-of-strategy'], container.guid);
			for (const payloadType of container.payload.chapterType ?? []) {
				params.append('payloadType', payloadType);
			}
		} else if (isPartOfStrategyRelation) {
			const strategy = relatedContainers
				.filter(isStrategyContainer)
				.find(({ relation }) =>
					relation.some(
						({ predicate, object }) =>
							object == isPartOfStrategyRelation.object &&
							predicate == isPartOfStrategyRelation.predicate
					)
				);
			params.append(
				predicates.enum['is-part-of-strategy'],
				String(isPartOfStrategyRelation.object)
			);
			params.append('position', String(isPartOfStrategyRelation.position + 1));
			for (const payloadType of strategy?.payload.chapterType ?? []) {
				params.append('payloadType', payloadType);
			}
		} else if (isPartOfMeasureRelation) {
			params.append(predicates.enum['is-part-of-measure'], String(isPartOfMeasureRelation.object));
			params.append('payloadType', payloadTypes.enum.measure_result);
			params.append('payloadType', payloadTypes.enum.milestone);
			params.append('payloadType', payloadTypes.enum.task);
		}

		await goto(`#${params.toString()}`, { state: { derivedFrom: container } });
	}

	function createContainerDerivedFrom(container: AnyContainer) {
		return async (event: Event) => {
			$newContainer = containerOfType(
				(event as CustomEvent).detail.selected,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;

			$newContainer.payload = {
				...$newContainer.payload,
				...('assignee' in container.payload && isTaskContainer($newContainer)
					? { assignee: container.payload.assignee }
					: undefined),
				...('audience' in container.payload && 'audience' in $newContainer.payload
					? { audience: container.payload.audience }
					: undefined),
				...('category' in container.payload && 'category' in $newContainer.payload
					? { category: container.payload.category }
					: undefined),
				...('resolutionStatus' in container.payload && 'resolutionStatus' in $newContainer.payload
					? { resolutionStatus: container.payload.resolutionStatus }
					: undefined),
				...('status' in container.payload && 'status' in $newContainer.payload
					? { status: container.payload.status }
					: undefined),
				...('taskCategory' in container.payload && 'taskCategory' in $newContainer.payload
					? { taskCategory: container.payload.taskCategory }
					: undefined),
				...('taskStatus' in container.payload && 'taskStatus' in $newContainer.payload
					? { taskStatus: container.payload.taskStatus }
					: undefined),
				...('topic' in container.payload && 'topic' in $newContainer.payload
					? { topic: container.payload.topic }
					: undefined),
				...('visibility' in container.payload && 'visibility' in $newContainer.payload
					? { visibility: container.payload.visibility }
					: undefined)
			};

			const isPartOfStrategyRelation = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
			);

			const isPartOfMeasureRelation = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-measure']
			);

			if (isStrategyContainer(container)) {
				$newContainer.relation = [
					{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of-strategy'] }
				];
			} else if (isPartOfStrategyRelation) {
				$newContainer.relation = [
					{
						object: isPartOfStrategyRelation.object,
						position: isPartOfStrategyRelation.position + 1,
						predicate: predicates.enum['is-part-of-strategy']
					}
				];
			} else if (isPartOfMeasureRelation) {
				$newContainer.relation = [
					{
						object: isPartOfMeasureRelation.object,
						position: 0,
						predicate: predicates.enum['is-part-of-measure']
					}
				];
			}

			createContainerDialog.getElement().showModal();
		};
	}

	async function createCopy(container: AnyContainer) {
		await goto(`#create=${container.payload.type}&copy-of=${container.guid}`);
	}

	function createOverallObjective(c: IndicatorContainer) {
		return async () => {
			const objective = await createObjective(c, c);
			await goto(`#view=${objective.guid}&edit`, { invalidateAll: true });
		};
	}

	let confirmDeleteDialog: HTMLDialogElement;

	async function handleDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
				await goto(`#${newParams.toString()}`, { invalidateAll: true });
			} else {
				await goto('#', { invalidateAll: true });
			}
		}
		confirmDeleteDialog.close();
	}

	let isThinking = false;

	async function askAI(container: StrategyContainer) {
		isThinking = true;

		try {
			const response = await fetch('/ask-ai', {
				credentials: 'include',
				body: new URLSearchParams({ strategy: container.guid }),
				method: 'POST'
			});

			if (response.ok) {
				await invalidateAll();
			} else if (response.status === 422) {
				const { message } = await response.json();
				alert(message);
			} else {
				alert($_('error_asking_ai'));
			}
		} catch (e) {
			alert($_('error_asking_ai'));
		} finally {
			isThinking = false;
		}
	}
</script>

<aside>
	{#if isStrategyContainer(container)}
		<Sidebar helpSlug={`${container.payload.type.replace('_', '-')}-view`}>
			<svelte:fragment slot="filters">
				<PayloadTypeFilter
					options={Array.from(
						new Set(
							relatedContainers
								.filter(({ guid, relation }) =>
									relation.some(
										({ predicate }) =>
											predicate === predicates.enum['is-part-of-strategy'] &&
											guid !== container.guid
									)
								)
								.map(({ payload }) => payload.type)
						)
					)}
				/>
				<CategoryFilter />
				<TopicFilter />
				<PolicyFieldBNKFilter />
			</svelte:fragment>
			<svelte:fragment slot="viewMode">
				<StrategyViewModes />
			</svelte:fragment>
			<ContainerDetailViewTabs {container} slot="tabs" />
			<slot slot="extra" />
		</Sidebar>
	{:else}
		<Sidebar helpSlug={`${container.payload.type.replace('_', '-')}-view`}>
			<ContainerDetailViewTabs {container} slot="tabs" />
			<slot slot="extra" />
		</Sidebar>
	{/if}
</aside>
{#if !createFeatureDecisions($page.data.features).useEditableDetailView() && isIndicatorContainer(container)}
	<header class="content-header">
		<IndicatorTabs {container} />
	</header>
{/if}
<div class="content-details masked-overflow">
	{#if createFeatureDecisions($page.data.features).useEditableDetailView()}
		{#if isEffectContainer(container)}
			{#await import('./EditableEffectDetailView.svelte') then { default: EditableEffectDetailView }}
				<EditableEffectDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isIndicatorContainer(container)}
			{#await import('./EditableIndicatorDetailView.svelte') then { default: EditableIndicatorDetailView }}
				<EditableIndicatorDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isContainerWithEffect(container)}
			{#await import('./EditableMeasureDetailView.svelte') then { default: EditableMeasureDetailView }}
				<EditableMeasureDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isMeasureResultContainer(container)}
			{#await import('./EditableMeasureResultDetailView.svelte') then { default: EditableMeasureResultDetailView }}
				<EditableMeasureResultDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isMilestoneContainer(container)}
			{#await import('./EditableMilestoneDetailView.svelte') then { default: EditableMilestoneDetailView }}
				<EditableMilestoneDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isModelContainer(container)}
			{#await import('./EditableModelDetailView.svelte') then { default: EditableModelDetailView }}
				<EditableModelDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isObjectiveContainer(container)}
			{#await import('./EditableObjectiveDetailView.svelte') then { default: EditableObjectiveDetailView }}
				<EditableObjectiveDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isOperationalGoalContainer(container)}
			{#await import('./EditableOperationalGoalDetailView.svelte') then { default: EditableOperationalGoalDetailView }}
				<EditableOperationalGoalDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isOrganizationalUnitContainer(container)}
			{#await import('./EditableOrganizationalUnitDetailView.svelte') then { default: EditableOrganizationalUnitDetailView }}
				<EditableOrganizationalUnitDetailView {container} {relatedContainers} />
			{/await}
		{:else if isResolutionContainer(container)}
			{#await import('./EditableResolutionDetailView.svelte') then { default: EditableResolutionDetailView }}
				<EditableResolutionDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isResourceContainer(container)}
			{#await import('./EditableResourceDetailView.svelte') then { default: EditableResourceDetailView }}
				<EditableResourceDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isStrategicGoalContainer(container)}
			{#await import('./EditableStrategicGoalDetailView.svelte') then { default: EditableStrategicGoalDetailView }}
				<EditableStrategicGoalDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isStrategyContainer(container)}
			{#await import('./EditableStrategyDetailView.svelte') then { default: EditableStrategyDetailView }}
				<EditableStrategyDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isTaskContainer(container)}
			{#await import('./EditableTaskDetailView.svelte') then { default: EditableTaskDetailView }}
				<EditableTaskDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isTextContainer(container)}
			{#await import('./EditableTextDetailView.svelte') then { default: EditableTextDetailView }}
				<EditableTextDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isVisionContainer(container)}
			{#await import('./EditableVisionDetailView.svelte') then { default: EditableVisionDetailView }}
				<EditableVisionDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{/if}
	{:else if isEffectContainer(container)}
		<EffectDetailView {container} {relatedContainers} {revisions} />
	{:else if isIndicatorContainer(container)}
		<IndicatorDetailView {container} {relatedContainers} {revisions} />
	{:else if isContainerWithEffect(container)}
		<MeasureDetailView {container} {relatedContainers} {revisions} />
	{:else if isMeasureResultContainer(container)}
		<MeasureResultDetailView {container} {relatedContainers} {revisions} />
	{:else if isObjectiveContainer(container)}
		<ObjectiveDetailView {container} {relatedContainers} {revisions} />
	{:else if isResolutionContainer(container)}
		<ResolutionDetailView {container} {relatedContainers} {revisions} />
	{:else if isResourceContainer(container)}
		<ResourceDetailView {container} {relatedContainers} {revisions} />
	{:else if isStrategyContainer(container)}
		<StrategyDetailView {container} {relatedContainers} {revisions} />
	{:else if isTaskContainer(container)}
		<TaskDetailView {container} {relatedContainers} {revisions} />
	{:else if isContainer(container)}
		<ContainerDetailView {container} {relatedContainers} {revisions} />
	{/if}
</div>
<footer class="content-footer">
	<div class="content-actions">
		{#if isIndicatorContainer(container) && !findOverallObjective(container, relatedContainers) && $ability.can('create', payloadTypes.enum.objective)}
			<button type="button" on:click={createOverallObjective(container)}>
				<PlusSmall />{$_('overall_objective')}
			</button>
		{/if}
		{#if mayShowRelationButton && $ability.can('relate', container)}
			<a class="button" href="#relations={container.guid}">
				{$_('establish_relations')}
			</a>
		{/if}
		{#if $ability.can('create', payloadTypes.enum.undefined) && mayDeriveFrom(container)}
			{#if createFeatureDecisions($page.data.features).useEditableDetailView()}
				<DropDownMenu
					handleChange={createContainerDerivedFrom(container)}
					label={$_('create_another')}
					options={createAnotherOptions}
				>
					{#snippet icon()}<PlusSmall />{/snippet}
				</DropDownMenu>
			{:else}
				<button class="primary" type="button" on:click={() => createAnother(container)}>
					<PlusSmall />{$_('create_another')}
				</button>
			{/if}
			{#if $user.adminOf.length > 0 && $ability.can('create', container.payload.type)}
				<button
					class="button-copycat"
					title={$_('copy')}
					type="button"
					on:click={() => createCopy(container)}
				>
					<CopyCat />
				</button>
			{/if}
			{#if createFeatureDecisions($page.data.features).useAI() && isStrategyContainer(container) && container.payload.pdf.length > 0 && $ability.can('create', payloadTypes.enum.undefined)}
				<button
					class="button-ai"
					class:is-active={isThinking}
					type="button"
					on:click={() => askAI(container)}
				>
					<AskAI />
					{$_('ask_ai')}
				</button>
			{/if}
		{/if}
		{#if isIndicatorContainer(container) && container.payload.quantity === quantities.enum['quantity.custom'] && $ability.can('create', payloadTypes.enum.indicator_template)}
			<button
				type="button"
				on:click={saveIndicatorAsTemplate(container)}
				disabled={saveAsIndicatorTemplateDisabled}
			>
				{$_('indicator.save_as_template')}
			</button>
		{/if}
		{#if createFeatureDecisions($page.data.features).useEditableDetailView() && $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
			<button
				aria-label={$_('delete')}
				class="delete quiet"
				type="button"
				on:click={() => confirmDeleteDialog.showModal()}
			>
				<TrashBin />
			</button>
		{/if}
	</div>
</footer>

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	handleSubmit={() => handleDelete(container)}
	{container}
	{relatedContainers}
/>
