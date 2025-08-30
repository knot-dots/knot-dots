<script lang="ts">
	import { getContext, hasContext, setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { source } from 'sveltekit-sse';
	import Check from '~icons/flowbite/check-outline';
	import CodeMerge from '~icons/flowbite/code-merge-outline';
	import Rotate from '~icons/flowbite/rotate-solid';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import AskAI from '~icons/knotdots/ask-ai';
	import CopyCat from '~icons/knotdots/copycat';
	import Plus from '~icons/knotdots/plus';
	import Relation from '~icons/knotdots/relation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import createObjective from '$lib/client/createObjective';
	import deleteContainer from '$lib/client/deleteContainer';
	import saveContainer from '$lib/client/saveContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableEffectDetailView from '$lib/components/EditableEffectDetailView.svelte';
	import EditableGoalDetailView from '$lib/components/EditableGoalDetailView.svelte';
	import EditableIndicatorDetailView from '$lib/components/EditableIndicatorDetailView.svelte';
	import EditableIndicatorTemplateDetailView from '$lib/components/EditableIndicatorTemplateDetailView.svelte';
	import EditableKnowledgeDetailView from '$lib/components/EditableKnowledgeDetailView.svelte';
	import EditableMeasureDetailView from '$lib/components/EditableMeasureDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableObjectiveDetailView from '$lib/components/EditableObjectiveDetailView.svelte';
	import EditableProgramDetailView from '$lib/components/EditableProgramDetailView.svelte';
	import EditableResourceDetailView from '$lib/components/EditableResourceDetailView.svelte';
	import EditableRuleDetailView from '$lib/components/EditableRuleDetailView.svelte';
	import EditableTaskDetailView from '$lib/components/EditableTaskDetailView.svelte';
	import EditableTextDetailView from '$lib/components/EditableTextDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import { getToastContext } from '$lib/contexts/toast';
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
		paramsFromFragment,
		type PayloadType,
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
	import {
		fetchContainersRelatedToIndicators,
		fetchContainersRelatedToMeasure,
		fetchContainersRelatedToProgram,
		fetchRelatedContainers
	} from '$lib/remote/data.remote';

	interface Props {
		container: AnyContainer;
		revisions?: AnyContainer[];
	}

	let { container: originalContainer, revisions = [] }: Props = $props();

	let isThinking = $state(false);

	let container = $state(originalContainer);

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let params = $derived.by(() => {
		if (isIndicatorContainer(container)) {
			return {
				organization: [container.organization],
				...(paramsFromFragment(page.url).has('program')
					? { program: [paramsFromFragment(page.url).get('program') as string] }
					: undefined)
			};
		} else if (isProgramContainer(container)) {
			return {
				audience: paramsFromFragment(page.url).getAll('audience'),
				category: paramsFromFragment(page.url).getAll('category'),
				policyFieldBNK: paramsFromFragment(page.url).getAll('policyFieldBNK'),
				terms: paramsFromFragment(page.url).get('terms') ?? '',
				topic: paramsFromFragment(page.url).getAll('topic')
			};
		} else {
			return {
				organization: [organization],
				relationType: [
					predicates.enum['is-consistent-with'],
					predicates.enum['is-equivalent-to'],
					predicates.enum['is-inconsistent-with'],
					predicates.enum['is-measured-by'],
					predicates.enum['is-objective-for'],
					predicates.enum['is-part-of'],
					predicates.enum['is-section-of']
				]
			};
		}
	});

	let relatedContainersPromise = $derived(
		isIndicatorContainer(container)
			? fetchContainersRelatedToIndicators({ guid, params })
			: isMeasureContainer(container)
				? fetchContainersRelatedToMeasure({ guid, params })
				: isProgramContainer(container)
					? fetchContainersRelatedToProgram({ guid, params })
					: fetchRelatedContainers({ guid, params })
	);

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

	function createAnotherOptions(container: AnyContainer, relatedContainers: Container[]) {
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
			{
				...container,
				payload: {
					...container.payload,
					...('title' in container.payload
						? {
								title: $_('copy_of', {
									values: { title: container.payload.title }
								})
							}
						: undefined)
				}
			} as Container,
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

	const toast = getToastContext();

	async function askAI(container: ProgramContainer) {
		isThinking = true;

		toast({
			icon: Rotate,
			heading: $_('toast.ai_job_started.heading'),
			message: $_('toast.ai_job_started.message'),
			status: 'info'
		});

		const stream = source('/ask-ai', {
			options: {
				body: new URLSearchParams([['program', container.guid]]),
				headers: { 'content-type': 'application/x-www-form-urlencoded' }
			}
		}).select('message');
		stream.subscribe((message) => {
			console.log(message);
			switch (message) {
				case 'error':
					isThinking = false;
					alert($_('ai_status.error'));
				case 'complete':
					isThinking = false;
					toast({ icon: Check, heading: $_('toast.ai_job_completed.heading'), status: 'success' });
				default:
					fetchContainersRelatedToProgram({ guid: container.guid, params }).refresh();
					break;
			}
		});
	}

	function byPayloadType(payloadType: PayloadType, url: URL) {
		const params = paramsFromFragment(url);
		return !params.has('type') || params.getAll('type').includes(payloadType);
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
			relatedContainersPromise.current?.filter(({ guid, relation }) =>
				relation.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-program'] && guid !== container.guid
				)
			) ?? []
		)}
		search
	/>
{:else if isMeasureContainer(container) || isSimpleMeasureContainer(container)}
	<Header />
{:else}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/if}

{#if relatedContainersPromise.current}
	{@const relatedContainers = relatedContainersPromise.current.filter(({ payload }) =>
		byPayloadType(payload.type, page.url)
	)}
	<div class="content-details masked-overflow">
		{#if isEffectContainer(container)}
			<EditableEffectDetailView bind:container {relatedContainers} {revisions} />
		{:else if isGoalContainer(container)}
			<EditableGoalDetailView bind:container {relatedContainers} {revisions} />
		{:else if isIndicatorContainer(container)}
			<EditableIndicatorDetailView bind:container {relatedContainers} {revisions} />
		{:else if isIndicatorTemplateContainer(container)}
			<EditableIndicatorTemplateDetailView bind:container {relatedContainers} {revisions} />
		{:else if isKnowledgeContainer(container)}
			<EditableKnowledgeDetailView bind:container {relatedContainers} {revisions} />
		{:else if isContainerWithEffect(container)}
			<EditableMeasureDetailView bind:container {relatedContainers} {revisions} />
		{:else if isObjectiveContainer(container)}
			<EditableObjectiveDetailView bind:container {relatedContainers} {revisions} />
		{:else if isOrganizationalUnitContainer(container)}
			<EditableOrganizationalUnitDetailView bind:container />
		{:else if isOrganizationContainer(container)}
			<EditableOrganizationDetailView bind:container />
		{:else if isProgramContainer(container)}
			{#key relatedContainers}
				<EditableProgramDetailView bind:container {relatedContainers} {revisions} />
			{/key}
		{:else if isResourceContainer(container)}
			<EditableResourceDetailView bind:container {relatedContainers} {revisions} />
		{:else if isRuleContainer(container)}
			<EditableRuleDetailView bind:container {relatedContainers} {revisions} />
		{:else if isTaskContainer(container)}
			<EditableTaskDetailView bind:container {relatedContainers} {revisions} />
		{:else if isTextContainer(container)}
			<EditableTextDetailView bind:container {relatedContainers} {revisions} />
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
					<Plus />{$_('overall_objective')}
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
					options={createAnotherOptions(container, relatedContainers)}
				>
					{#snippet icon()}<CodeMerge />{/snippet}
				</DropDownMenu>
			{/if}
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
{/if}

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
