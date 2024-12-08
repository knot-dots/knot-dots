<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CopyCat from '~icons/knotdots/copycat';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import createObjective from '$lib/client/createObjective';
	import saveContainer from '$lib/client/saveContainer';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ContainerDetailViewTabs from '$lib/components/ContainerDetailViewTabs.svelte';
	import EditableEffectDetailView from '$lib/components/EditableEffectDetailView.svelte';
	import EditableIndicatorDetailView from '$lib/components/EditableIndicatorDetailView.svelte';
	import EditableMeasureDetailView from '$lib/components/EditableMeasureDetailView.svelte';
	import EditableMeasureResultDetailView from '$lib/components/EditableMeasureResultDetailView.svelte';
	import EditableMilestoneDetailView from '$lib/components/EditableMilestoneDetailView.svelte';
	import EditableModelDetailView from '$lib/components/EditableModelDetailView.svelte';
	import EditableObjectiveDetailView from '$lib/components/EditableObjectiveDetailView.svelte';
	import EditableOperationalGoalDetailView from '$lib/components/EditableOperationalGoalDetailView.svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableResolutionDetailView from '$lib/components/EditableResolutionDetailView.svelte';
	import EditableResourceDetailView from '$lib/components/EditableResourceDetailView.svelte';
	import EditableStrategicGoalDetailView from '$lib/components/EditableStrategicGoalDetailView.svelte';
	import EditableStrategyDetailView from '$lib/components/EditableStrategyDetailView.svelte';
	import EditableTaskDetailView from '$lib/components/EditableTaskDetailView.svelte';
	import EditableVisionDetailView from '$lib/components/EditableVisionDetailView.svelte';
	import EffectDetailView from '$lib/components/EffectDetailView.svelte';
	import IndicatorDetailView from '$lib/components/IndicatorDetailView.svelte';
	import IndicatorTabs from '$lib/components/IndicatorTabs.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureResultDetailView from '$lib/components/MeasureResultDetailView.svelte';
	import MeasureStatusTabs from '$lib/components/MeasureStatusTabs.svelte';
	import ObjectiveDetailView from '$lib/components/ObjectiveDetailView.svelte';
	import PayloadTypeFilter from '$lib/components/PayloadTypeFilter.svelte';
	import ResolutionDetailView from '$lib/components/ResolutionDetailView.svelte';
	import ResolutionStatusTabs from '$lib/components/ResolutionStatusTabs.svelte';
	import ResourceDetailView from '$lib/components/ResourceDetailView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyViewModes from '$lib/components/StrategyViewModes.svelte';
	import TaskStatusTabs from '$lib/components/TaskStatusTabs.svelte';
	import TaskDetailView from '$lib/components/TaskDetailView.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		type Container,
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
		isVisionContainer,
		newIndicatorTemplateFromIndicator,
		overlayKey,
		payloadTypes,
		predicates,
		quantities
	} from '$lib/models';
	import { ability, user } from '$lib/stores';

	export let container: AnyContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[] = [];

	let mayShowRelationButton = getContext('mayShowRelationButton');
	let saveAsIndicatorTemplateDisabled = false;

	function saveIndicatorAsTemplate(c: IndicatorContainer) {
		return async () => {
			saveAsIndicatorTemplateDisabled = true;
			await saveContainer(newIndicatorTemplateFromIndicator(c));
		};
	}

	function mayDeriveFrom(container: AnyContainer) {
		return container.relation.some(
			({ predicate }) =>
				predicate === predicates.enum['is-part-of-strategy'] ||
				predicate === predicates.enum['is-part-of-measure']
		);
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

		if (isPartOfStrategyRelation) {
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
		}

		if (isPartOfMeasureRelation) {
			params.append(predicates.enum['is-part-of-measure'], String(isPartOfMeasureRelation.object));
			params.append('payloadType', payloadTypes.enum.measure_result);
			params.append('payloadType', payloadTypes.enum.milestone);
			params.append('payloadType', payloadTypes.enum.task);
		}

		await goto(`#${params.toString()}`, { state: { derivedFrom: container } });
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
{#if isIndicatorContainer(container)}
	<header class="content-header">
		<IndicatorTabs {container} />
	</header>
{:else if isContainerWithEffect(container)}
	<header class="content-header">
		<MeasureStatusTabs {container} {revisions} />
	</header>
{:else if isResolutionContainer(container)}
	<header class="content-header">
		<ResolutionStatusTabs {container} {revisions} />
	</header>
{:else if isTaskContainer(container)}
	<header class="content-header">
		<TaskStatusTabs {container} {revisions} />
	</header>
{/if}
<div class="content-details masked-overflow">
	{#if createFeatureDecisions($page.data.features).useEditableDetailView()}
		{#if isEffectContainer(container)}
			<EditableEffectDetailView {container} {relatedContainers} {revisions} />
		{:else if isIndicatorContainer(container)}
			<EditableIndicatorDetailView {container} {relatedContainers} {revisions} />
		{:else if isContainerWithEffect(container)}
			<EditableMeasureDetailView {container} {relatedContainers} {revisions} />
		{:else if isMeasureResultContainer(container)}
			<EditableMeasureResultDetailView {container} {relatedContainers} {revisions} />
		{:else if isMilestoneContainer(container)}
			<EditableMilestoneDetailView {container} {relatedContainers} {revisions} />
		{:else if isModelContainer(container)}
			<EditableModelDetailView {container} {relatedContainers} {revisions} />
		{:else if isObjectiveContainer(container)}
			<EditableObjectiveDetailView {container} {relatedContainers} {revisions} />
		{:else if isOperationalGoalContainer(container)}
			<EditableOperationalGoalDetailView {container} {relatedContainers} {revisions} />
		{:else if isOrganizationalUnitContainer(container)}
			<EditableOrganizationalUnitDetailView {container} {relatedContainers} />
		{:else if isResolutionContainer(container)}
			<EditableResolutionDetailView {container} {relatedContainers} {revisions} />
		{:else if isResourceContainer(container)}
			<EditableResourceDetailView {container} {relatedContainers} {revisions} />
		{:else if isStrategicGoalContainer(container)}
			<EditableStrategicGoalDetailView {container} {relatedContainers} {revisions} />
		{:else if isStrategyContainer(container)}
			<EditableStrategyDetailView {container} {relatedContainers} {revisions} />
		{:else if isTaskContainer(container)}
			<EditableTaskDetailView {container} {relatedContainers} {revisions} />
		{:else if isVisionContainer(container)}
			<EditableVisionDetailView {container} {relatedContainers} {revisions} />
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
			<a class="button" href="#relate={container.guid}">
				{$_('establish_relations')}
			</a>
		{/if}
		{#if $ability.can('create', payloadTypes.enum.undefined) && mayDeriveFrom(container)}
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
		{#if isIndicatorContainer(container) && container.payload.quantity === quantities.enum['quantity.custom'] && $ability.can('create', payloadTypes.enum.indicator_template)}
			<button
				type="button"
				on:click={saveIndicatorAsTemplate(container)}
				disabled={saveAsIndicatorTemplateDisabled}
			>
				{$_('indicator.save_as_template')}
			</button>
		{/if}
	</div>
</footer>
