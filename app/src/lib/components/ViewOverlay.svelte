<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import AskAIButton from '$lib/components/AskAIButton.svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import CreateOverallObjectiveButton from '$lib/components/CreateOverallObjectiveButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
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
	import RelationButton from '$lib/components/RelationButton.svelte';
	import SaveAsIndicatorTemplateButton from '$lib/components/SaveAsIndicatorTemplateButton.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		audience,
		computeFacetCount,
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
		paramsFromFragment,
		type PayloadType,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
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

	let container = $state(originalContainer);

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let params = $derived.by(() => {
		if (isIndicatorContainer(container)) {
			return {
				organization: [container.organization],
				...(paramsFromFragment(page.url).has('program')
					? { program: paramsFromFragment(page.url).get('program') as string }
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
			{#if isIndicatorContainer(container)}
				<CreateOverallObjectiveButton {container} {relatedContainers} />
			{/if}
			<RelationButton {container} />
			<CreateAnotherButton {container} {relatedContainers} />
			<CreateCopyButton {container} />
			{#if createFeatureDecisions(page.data.features).useAI() && isProgramContainer(container)}
				<AskAIButton {container} />
			{/if}
			{#if isIndicatorContainer(container)}
				<SaveAsIndicatorTemplateButton {container} {relatedContainers} />
			{/if}
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>

	<Help slug={`${container.payload.type.replace('_', '-')}-view`} />
{/if}

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
