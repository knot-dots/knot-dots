<script lang="ts">
	import { getContext, hasContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CodeMerge from '~icons/flowbite/code-merge-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import AskAI from '~icons/knotdots/ask-ai';
	import CopyCat from '~icons/knotdots/copycat';
	import Relation from '~icons/knotdots/relation';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import createObjective from '$lib/client/createObjective';
	import deleteContainer from '$lib/client/deleteContainer';
	import saveContainer from '$lib/client/saveContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		audience,
		computeFacetCount,
		type Container,
		containerOfType,
		createCopyOf,
		findOverallObjective,
		type IndicatorContainer,
		isContainerWithEffect,
		isEffectContainer,
		isGoalContainer,
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		isKnowledgeContainer,
		isMeasureContainer,
		isObjectiveContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isProgramContainer,
		isResourceContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		isTextContainer,
		type NewContainer,
		newIndicatorTemplateFromIndicator,
		payloadTypes,
		policyFieldBNK,
		predicates,
		type ProgramContainer,
		quantities,
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

	let { container: originalContainer, relatedContainers, revisions = [] }: Props = $props();

	let container = $state(originalContainer);

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

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	let createAnotherOptions = $derived.by(() => {
		let createAnotherOptions: { label: string; value: string }[] = [];

		const isPartOfProgramRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-program']
		);
		const isPartOfMeasureRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		);

		if (isProgramContainer(container)) {
			createAnotherOptions = [...container.payload.chapterType].map((p) => ({
				label: $_(p),
				value: p
			}));
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
			createAnotherOptions = [...(program?.payload.chapterType ?? [])].map((p) => ({
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

	async function createCopy(container: AnyContainer) {
		const organizationalUnit = page.data.organizationalUnits.find(
			(o) => $user.adminOf[0] == o.guid
		);
		let organization;
		if (organizationalUnit) {
			organization = organizationalUnit.organization;
		} else {
			organization = page.data.organizations.find((o) => $user.adminOf[0] == o.guid)
				?.guid as string;
		}

		$newContainer = createCopyOf(
			container as Container,
			organization,
			organizationalUnit?.guid ?? null
		) as NewContainer;

		createContainerDialog.getElement().showModal();
	}

	function createOverallObjective(c: IndicatorContainer) {
		return async () => {
			const objective = await createObjective(c, c);
			await goto(`#view=${objective.guid}`, { invalidateAll: true });
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

	async function askAI(container: ProgramContainer) {
		isThinking = true;

		try {
			const response = await fetch('/ask-ai', {
				credentials: 'include',
				body: new URLSearchParams({ program: container.guid }),
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

{#if isProgramContainer(container)}
	<Header
		facets={computeFacetCount(
			new Map([
				['type', new Map(container.payload.chapterType.map((v) => [v as string, 0]))],
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
			]),
			relatedContainers.filter(({ guid, relation }) =>
				relation.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-program'] && guid !== container.guid
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

<div class="content-details masked-overflow">
	{#if isEffectContainer(container)}
		{#await import('./EditableEffectDetailView.svelte') then { default: EditableEffectDetailView }}
			<EditableEffectDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isGoalContainer(container)}
		{#await import('./EditableGoalDetailView.svelte') then { default: EditableGoalDetailView }}
			<EditableGoalDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isIndicatorContainer(container)}
		{#await import('./EditableIndicatorDetailView.svelte') then { default: EditableIndicatorDetailView }}
			<EditableIndicatorDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isIndicatorTemplateContainer(container)}
		{#await import('./EditableIndicatorTemplateDetailView.svelte') then { default: EditableIndicatorTemplateDetailView }}
			<EditableIndicatorTemplateDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isKnowledgeContainer(container)}
		{#await import('./EditableKnowledgeDetailView.svelte') then { default: EditableKnowledgeDetailView }}
			<EditableKnowledgeDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isContainerWithEffect(container)}
		{#await import('./EditableMeasureDetailView.svelte') then { default: EditableMeasureDetailView }}
			<EditableMeasureDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isObjectiveContainer(container)}
		{#await import('./EditableObjectiveDetailView.svelte') then { default: EditableObjectiveDetailView }}
			<EditableObjectiveDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isOrganizationalUnitContainer(container)}
		{#await import('./EditableOrganizationalUnitDetailView.svelte') then { default: EditableOrganizationalUnitDetailView }}
			<EditableOrganizationalUnitDetailView bind:container />
		{/await}
	{:else if isOrganizationContainer(container)}
		{#await import('./EditableOrganizationDetailView.svelte') then { default: EditableOrganizationDetailView }}
			<EditableOrganizationDetailView bind:container />
		{/await}
	{:else if isProgramContainer(container)}
		{#await import('./EditableProgramDetailView.svelte') then { default: EditableProgramDetailView }}
			{#key relatedContainers}
				<EditableProgramDetailView bind:container {relatedContainers} {revisions} />
			{/key}
		{/await}
	{:else if isResourceContainer(container)}
		{#await import('./EditableResourceDetailView.svelte') then { default: EditableResourceDetailView }}
			<EditableResourceDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isRuleContainer(container)}
		{#await import('./EditableRuleDetailView.svelte') then { default: EditableRuleDetailView }}
			<EditableRuleDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isTaskContainer(container)}
		{#await import('./EditableTaskDetailView.svelte') then { default: EditableTaskDetailView }}
			<EditableTaskDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{:else if isTextContainer(container)}
		{#await import('./EditableTextDetailView.svelte') then { default: EditableTextDetailView }}
			<EditableTextDetailView bind:container {relatedContainers} {revisions} />
		{/await}
	{/if}
</div>
<footer class="content-footer bottom-actions-bar">
	<div class="content-actions">
		{#if $applicationState.containerDetailView.editable && isMeasureContainer(container) && $ability.can('update', container)}
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
			<a class="button button-relation" href="#relations={container.guid}">
				<Relation />
				{$_('relations')}
			</a>
		{/if}
		{#if $ability.can('create', payloadTypes.enum.undefined) && mayDeriveFrom(container)}
			<DropDownMenu
				handleChange={createContainerDerivedFrom(container)}
				label={$_('create_another')}
				options={createAnotherOptions}
			>
				{#snippet icon()}<CodeMerge />{/snippet}
			</DropDownMenu>
			{#if $user.adminOf.length > 0 && $ability.can('create', container.payload.type)}
				<button class="button-copycat" type="button" onclick={() => createCopy(container)}>
					<CopyCat />
					{$_('copy')}
				</button>
			{/if}
			{#if createFeatureDecisions(page.data.features).useAI() && isProgramContainer(container) && container.payload.pdf.length > 0 && $ability.can('create', payloadTypes.enum.undefined)}
				<button
					class="button-ai"
					class:is-active={isThinking}
					type="button"
					onclick={() => askAI(container as ProgramContainer)}
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
		{#if $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
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
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
