<script lang="ts">
	import type { Snippet } from 'svelte';
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
	import EditablePageDetailView from '$lib/components/EditablePageDetailView.svelte';
	import EditableProgramDetailView from '$lib/components/EditableProgramDetailView.svelte';
	import EditableReportDetailView from '$lib/components/EditableReportDetailView.svelte';
	import EditableResourceDetailView from '$lib/components/EditableResourceDetailView.svelte';
	import EditableResourceV2DetailView from '$lib/components/EditableResourceV2DetailView.svelte';
	import EditableRuleDetailView from '$lib/components/EditableRuleDetailView.svelte';
	import EditableTaskDetailView from '$lib/components/EditableTaskDetailView.svelte';
	import EditableTeaserDetailView from '$lib/components/EditableTeaserDetailView.svelte';
	import EditableTextDetailView from '$lib/components/EditableTextDetailView.svelte';
	import EditableTermDetailView from '$lib/components/EditableTermDetailView.svelte';
	import {
		type AnyContainer,
		isCategoryContainer,
		isContainerWithEffect,
		isContentPartnerContainer,
		isEffectContainer,
		isGoalContainer,
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		isKnowledgeContainer,
		isObjectiveContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isPageContainer,
		isProgramContainer,
		isReportContainer,
		isResourceContainer,
		isResourceV2Container,
		isRuleContainer,
		isTermContainer,
		isTaskContainer,
		isTeaserContainer,
		isTextContainer
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions?: AnyContainer[];
	}

	let { container: originalContainer, layout, revisions = [] }: Props = $props();

	let container = $derived.by(() => {
		let _ = $state(originalContainer);
		return _;
	});
</script>

{#if isContentPartnerContainer(container)}
	<EditableContentPartnerDetailView bind:container {layout} {revisions} />
{:else if isEffectContainer(container)}
	<EditableEffectDetailView bind:container {layout} {revisions} />
{:else if isGoalContainer(container)}
	<EditableGoalDetailView bind:container {layout} {revisions} />
{:else if isCategoryContainer(container)}
	<EditableCategoryDetailView bind:container {layout} />
{:else if isIndicatorContainer(container)}
	<EditableIndicatorDetailView bind:container {layout} {revisions} />
{:else if isIndicatorTemplateContainer(container)}
	<EditableIndicatorTemplateDetailView bind:container {layout} {revisions} />
{:else if isKnowledgeContainer(container)}
	<EditableKnowledgeDetailView bind:container {layout} {revisions} />
{:else if isContainerWithEffect(container)}
	<EditableMeasureDetailView bind:container {layout} {revisions} />
{:else if isObjectiveContainer(container)}
	<EditableObjectiveDetailView bind:container {layout} {revisions} />
{:else if isOrganizationalUnitContainer(container)}
	<EditableOrganizationalUnitDetailView bind:container {layout} />
{:else if isOrganizationContainer(container)}
	<EditableOrganizationDetailView bind:container {layout} />
{:else if isPageContainer(container)}
	<EditablePageDetailView bind:container {layout} {revisions} />
{:else if isProgramContainer(container)}
	<EditableProgramDetailView bind:container {layout} {revisions} />
{:else if isReportContainer(container)}
	<EditableReportDetailView bind:container {layout} {revisions} />
{:else if isResourceContainer(container)}
	<EditableResourceDetailView bind:container {layout} {revisions} />
{:else if isResourceV2Container(container)}
	<EditableResourceV2DetailView bind:container {layout} {revisions} />
{:else if isRuleContainer(container)}
	<EditableRuleDetailView bind:container {layout} {revisions} />
{:else if isTermContainer(container)}
	<EditableTermDetailView bind:container {layout} {revisions} />
{:else if isTaskContainer(container)}
	<EditableTaskDetailView bind:container {layout} {revisions} />
{:else if isTeaserContainer(container)}
	<EditableTeaserDetailView bind:container {layout} {revisions} />
{:else if isTextContainer(container)}
	<EditableTextDetailView bind:container {layout} {revisions} />
{/if}
