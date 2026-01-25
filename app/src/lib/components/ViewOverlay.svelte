<script lang="ts">
	import { page } from '$app/state';
	import EditableCategoryDetailView from '$lib/components/EditableCategoryDetailView.svelte';
	import EditableContentPartnerDetailView from '$lib/components/EditableContentPartnerDetailView.svelte';
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
	import EditableReportDetailView from '$lib/components/EditableReportDetailView.svelte';
	import EditableResourceDetailView from '$lib/components/EditableResourceDetailView.svelte';
	import EditableResourceV2DetailView from '$lib/components/EditableResourceV2DetailView.svelte';
	import EditableRuleDetailView from '$lib/components/EditableRuleDetailView.svelte';
	import EditableTaskDetailView from '$lib/components/EditableTaskDetailView.svelte';
	import EditableTeaserDetailView from '$lib/components/EditableTeaserDetailView.svelte';
	import EditableTextDetailView from '$lib/components/EditableTextDetailView.svelte';
	import EditableTermDetailView from '$lib/components/EditableTermDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import {
		type AnyContainer,
		audience,
		computeFacetCount,
		isCategoryContainer,
		isContainerWithEffect,
		isContentPartnerContainer,
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
		isReportContainer,
		isResourceContainer,
		isResourceV2Container,
		isRuleContainer,
		isTermContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		isTeaserContainer,
		isTextContainer,
		paramsFromFragment,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import {
		fetchContainersRelatedToIndicators,
		fetchContainersRelatedToIndicatorTemplates,
		fetchContainersRelatedToMeasure,
		fetchContainersRelatedToProgram,
		fetchContainersRelatedToResource,
		fetchRelatedContainers
	} from '$lib/remote/data.remote';

	interface Props {
		container: AnyContainer;
		revisions?: AnyContainer[];
	}

	let { container: originalContainer, revisions = [] }: Props = $props();

	// eslint-disable-next-line svelte/prefer-writable-derived
	let container = $state(originalContainer);

	$effect(() => {
		container = originalContainer;
	});

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersPromise = $derived.by(() => {
		if (isIndicatorContainer(container)) {
			return fetchContainersRelatedToIndicators({
				guid,
				params: {
					organization: [container.organization],
					...(page.data.currentOrganizationalUnit
						? { organizationalUnit: page.data.currentOrganizationalUnit.guid }
						: undefined),
					...(paramsFromFragment(page.url).has('program')
						? { program: paramsFromFragment(page.url).get('program') as string }
						: undefined)
				}
			});
		} else if (isIndicatorTemplateContainer(container)) {
			return fetchContainersRelatedToIndicatorTemplates({
				guid,
				params: {
					organization: page.data.currentOrganization.guid,
					...(page.data.currentOrganizationalUnit
						? { organizationalUnit: page.data.currentOrganizationalUnit.guid }
						: undefined)
				}
			});
		} else if (isMeasureContainer(container)) {
			return fetchContainersRelatedToMeasure(guid);
		} else if (isProgramContainer(container)) {
			return fetchContainersRelatedToProgram({
				guid,
				params: {
					audience: paramsFromFragment(page.url).getAll('audience'),
					category: paramsFromFragment(page.url).getAll('category'),
					policyFieldBNK: paramsFromFragment(page.url).getAll('policyFieldBNK'),
					terms: paramsFromFragment(page.url).get('terms') ?? '',
					topic: paramsFromFragment(page.url).getAll('topic')
				}
			});
		} else if (isResourceV2Container(container)) {
			return fetchContainersRelatedToResource({
				guid,
				params: {
					organization: [page.data.currentOrganization.guid],
					relationType: [
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['is-measured-by'],
						predicates.enum['is-objective-for'],
						predicates.enum['is-part-of'],
						predicates.enum['is-section-of']
					]
				}
			});
		} else {
			return fetchRelatedContainers({
				guid,
				params: {
					organization: [organization],
					relationType: [
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['is-measured-by'],
						predicates.enum['is-objective-for'],
						predicates.enum['is-part-of'],
						predicates.enum['is-part-of-category'],
						predicates.enum['is-section-of']
					]
				}
			});
		}
	});
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

{#if isProgramContainer(container)}
	<EditableProgramDetailView
		bind:container
		relatedContainersQuery={relatedContainersPromise}
		{revisions}
	/>
{:else if relatedContainersPromise.current}
	{@const relatedContainers = relatedContainersPromise.current}
	{#if isContentPartnerContainer(container)}
		<EditableContentPartnerDetailView bind:container {relatedContainers} {revisions} />
	{:else if isEffectContainer(container)}
		<EditableEffectDetailView bind:container {relatedContainers} {revisions} />
	{:else if isGoalContainer(container)}
		<EditableGoalDetailView bind:container {relatedContainers} {revisions} />
	{:else if isCategoryContainer(container)}
		<EditableCategoryDetailView bind:container {relatedContainers} />
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
	{:else if isReportContainer(container)}
		<EditableReportDetailView bind:container {relatedContainers} {revisions} />
	{:else if isResourceContainer(container)}
		<EditableResourceDetailView bind:container {relatedContainers} {revisions} />
	{:else if isResourceV2Container(container)}
		<EditableResourceV2DetailView bind:container {relatedContainers} {revisions} />
	{:else if isRuleContainer(container)}
		<EditableRuleDetailView bind:container {relatedContainers} {revisions} />
	{:else if isTermContainer(container)}
		<EditableTermDetailView bind:container {relatedContainers} {revisions} />
	{:else if isTaskContainer(container)}
		<EditableTaskDetailView bind:container {relatedContainers} {revisions} />
	{:else if isTeaserContainer(container)}
		<EditableTeaserDetailView bind:container {relatedContainers} {revisions} />
	{:else if isTextContainer(container)}
		<EditableTextDetailView bind:container {relatedContainers} {revisions} />
	{/if}

	<Help slug={`${container.payload.type.replace('_', '-')}-view`} />
{/if}
