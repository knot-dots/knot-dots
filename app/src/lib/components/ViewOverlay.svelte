<script lang="ts">
	import { getContext, hasContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import AskAI from '~icons/knotdots/ask-ai';
	import CopyCat from '~icons/knotdots/copycat';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import createObjective from '$lib/client/createObjective';
	import deleteContainer from '$lib/client/deleteContainer';
	import saveContainer from '$lib/client/saveContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EffectDetailView from '$lib/components/EffectDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IndicatorDetailView from '$lib/components/IndicatorDetailView.svelte';
	import IndicatorTabs from '$lib/components/IndicatorTabs.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import ObjectiveDetailView from '$lib/components/ObjectiveDetailView.svelte';
	import ResolutionDetailView from '$lib/components/ResolutionDetailView.svelte';
	import ResourceDetailView from '$lib/components/ResourceDetailView.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import TaskDetailView from '$lib/components/TaskDetailView.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		audience,
		computeFacetCount,
		type Container,
		containerOfType,
		findOverallObjective,
		type IndicatorContainer,
		isContainer,
		isContainerWithEffect,
		isEffectContainer,
		isGoalContainer,
		isIndicatorContainer,
		isMeasureContainer,
		isObjectiveContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isResolutionContainer,
		isResourceContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		isTaskContainer,
		isTextContainer,
		type NewContainer,
		newIndicatorTemplateFromIndicator,
		overlayKey,
		payloadTypes,
		policyFieldBNK,
		predicates,
		quantities,
		type StrategyContainer,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import {
		ability,
		applicationState,
		mayDeleteContainer,
		newContainer,
		overlayHistory,
		user
	} from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: Container[];
		revisions?: AnyContainer[];
	}

	let { container, relatedContainers, revisions = [] }: Props = $props();

	let mayShowRelationButton =
		hasContext('relationOverlay') &&
		(getContext('relationOverlay') as { enabled: boolean }).enabled;

	let saveAsIndicatorTemplateDisabled = $state(false);

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

	let createAnotherOptions = $derived.by(() => {
		let createAnotherOptions: { label: string; value: string }[] = [];

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
			createAnotherOptions = [payloadTypes.enum.goal, payloadTypes.enum.task].map((p) => ({
				label: $_(p),
				value: p
			}));
		}

		return createAnotherOptions;
	});

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
			params.append('payloadType', payloadTypes.enum.goal);
			params.append('payloadType', payloadTypes.enum.task);
		}

		await goto(`#${params.toString()}`, { state: { derivedFrom: container } });
	}

	function createContainerDerivedFrom(container: AnyContainer) {
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
				...('resolutionStatus' in container.payload && 'resolutionStatus' in derived.payload
					? { resolutionStatus: container.payload.resolutionStatus }
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

			const isPartOfStrategyRelation = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
			);

			const isPartOfMeasureRelation = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-measure']
			);

			if (isStrategyContainer(container)) {
				derived.relation = [
					{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of-strategy'] }
				];
			} else if (isPartOfStrategyRelation) {
				derived.relation = [
					{
						object: isPartOfStrategyRelation.object,
						position: isPartOfStrategyRelation.position + 1,
						predicate: predicates.enum['is-part-of-strategy']
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

	async function createCopy(container: AnyContainer) {
		await goto(`#create=${container.payload.type}&copy-of=${container.guid}`);
	}

	function createOverallObjective(c: IndicatorContainer) {
		return async () => {
			const objective = await createObjective(c, c);
			await goto(`#view=${objective.guid}&edit`, { invalidateAll: true });
		};
	}

	// svelte-ignore non_reactive_update
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

	let isThinking = $state(false);

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

{#if isStrategyContainer(container)}
	{@const facets = new Map([
		['type', new Map(container.payload.chapterType.map((v) => [v as string, 0]))],
		['audience', new Map(audience.options.map((v) => [v as string, 0]))],
		['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
		['topic', new Map(topics.options.map((v) => [v as string, 0]))],
		['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
	])}
	<Header
		facets={computeFacetCount(
			facets,
			relatedContainers.filter(({ guid, relation }) =>
				relation.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-strategy'] && guid != container.guid
				)
			)
		)}
		search
	/>
{:else if isMeasureContainer(container) || isSimpleMeasureContainer(container)}
	<Header />
{:else}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/if}

{#if !createFeatureDecisions(page.data.features).useEditableDetailView() && isIndicatorContainer(container)}
	<header class="content-header">
		<IndicatorTabs {container} />
	</header>
{/if}
<div class="content-details masked-overflow">
	{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
		{#if isEffectContainer(container)}
			{#await import('./EditableEffectDetailView.svelte') then { default: EditableEffectDetailView }}
				<EditableEffectDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isGoalContainer(container)}
			{#await import('./EditableGoalDetailView.svelte') then { default: EditableGoalDetailView }}
				<EditableGoalDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isIndicatorContainer(container)}
			{#await import('./EditableIndicatorDetailView.svelte') then { default: EditableIndicatorDetailView }}
				<EditableIndicatorDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isContainerWithEffect(container)}
			{#await import('./EditableMeasureDetailView.svelte') then { default: EditableMeasureDetailView }}
				<EditableMeasureDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isObjectiveContainer(container)}
			{#await import('./EditableObjectiveDetailView.svelte') then { default: EditableObjectiveDetailView }}
				<EditableObjectiveDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isOrganizationalUnitContainer(container)}
			{#await import('./EditableOrganizationalUnitDetailView.svelte') then { default: EditableOrganizationalUnitDetailView }}
				<EditableOrganizationalUnitDetailView {container} />
			{/await}
		{:else if isOrganizationContainer(container)}
			{#await import('./EditableOrganizationDetailView.svelte') then { default: EditableOrganizationDetailView }}
				<EditableOrganizationDetailView {container} />
			{/await}
		{:else if isResolutionContainer(container)}
			{#await import('./EditableResolutionDetailView.svelte') then { default: EditableResolutionDetailView }}
				<EditableResolutionDetailView {container} {relatedContainers} {revisions} />
			{/await}
		{:else if isResourceContainer(container)}
			{#await import('./EditableResourceDetailView.svelte') then { default: EditableResourceDetailView }}
				<EditableResourceDetailView {container} {relatedContainers} {revisions} />
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
		{/if}
	{:else if isEffectContainer(container)}
		<EffectDetailView {container} {relatedContainers} {revisions} />
	{:else if isIndicatorContainer(container)}
		<IndicatorDetailView {container} {relatedContainers} {revisions} />
	{:else if isContainerWithEffect(container)}
		<MeasureDetailView {container} {relatedContainers} {revisions} />
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
<footer
	class="content-footer"
	class:content-footer--new={createFeatureDecisions(page.data.features).useEditableDetailView()}
>
	<div class="content-actions">
		{#if createFeatureDecisions(page.data.features).useEditableDetailView() && isMeasureContainer(container)}
			<label>
				<input
					class="toggle"
					name="template"
					type="checkbox"
					bind:checked={container.payload.template}
				/>
				{$_('template')}
			</label>
		{/if}
		{#if isIndicatorContainer(container) && !findOverallObjective(container, relatedContainers) && $ability.can('create', payloadTypes.enum.objective)}
			<button type="button" onclick={createOverallObjective(container)}>
				<PlusSmall />{$_('overall_objective')}
			</button>
		{/if}
		{#if mayShowRelationButton && $ability.can('relate', container)}
			<a class="button" href="#relations={container.guid}">
				{$_('establish_relations')}
			</a>
		{/if}
		{#if $ability.can('create', payloadTypes.enum.undefined) && mayDeriveFrom(container)}
			{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
				<DropDownMenu
					handleChange={createContainerDerivedFrom(container)}
					label={$_('create_another')}
					options={createAnotherOptions}
				>
					{#snippet icon()}<PlusSmall />{/snippet}
				</DropDownMenu>
			{:else}
				<button class="primary" type="button" onclick={() => createAnother(container)}>
					<PlusSmall />{$_('create_another')}
				</button>
			{/if}
			{#if $user.adminOf.length > 0 && $ability.can('create', container.payload.type)}
				<button
					class="button-copycat"
					title={$_('copy')}
					type="button"
					onclick={() => createCopy(container)}
				>
					<CopyCat />
				</button>
			{/if}
			{#if createFeatureDecisions(page.data.features).useAI() && isStrategyContainer(container) && container.payload.pdf.length > 0 && $ability.can('create', payloadTypes.enum.undefined)}
				<button
					class="button-ai"
					class:is-active={isThinking}
					type="button"
					onclick={() => askAI(container)}
				>
					<AskAI />
					{$_('ask_ai')}
				</button>
			{/if}
		{/if}
		{#if isIndicatorContainer(container) && container.payload.quantity === quantities.enum['quantity.custom'] && $ability.can('create', payloadTypes.enum.indicator_template)}
			<button
				type="button"
				onclick={saveIndicatorAsTemplate(container)}
				disabled={saveAsIndicatorTemplateDisabled}
			>
				{$_('indicator.save_as_template')}
			</button>
		{/if}
		{#if createFeatureDecisions(page.data.features).useEditableDetailView() && $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
			<button
				aria-label={$_('delete')}
				class="delete quiet"
				type="button"
				onclick={() => confirmDeleteDialog.showModal()}
			>
				<TrashBin />
			</button>
		{/if}
	</div>
</footer>

<Help slug={`${container.payload.type.replace('_', '-')}-view`} />

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	handleSubmit={() => handleDelete(container)}
	{container}
	{relatedContainers}
/>

<style>
	.content-footer.content-footer--new {
		padding-bottom: 0;
	}

	.content-footer.content-footer--new .content-actions {
		font-size: 0.875rem;
		margin-top: 0;
		padding: 0.5rem 2rem;
	}

	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
