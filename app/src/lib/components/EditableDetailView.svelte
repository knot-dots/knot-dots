<script lang="ts">
	import type { Snippet } from 'svelte';
	import EditableBinaryIndicatorDetailView from '$lib/components/EditableBinaryIndicatorDetailView.svelte';
	import EditableCategoryDetailView from '$lib/components/EditableCategoryDetailView.svelte';
	import EditableContentPartnerDetailView from '$lib/components/EditableContentPartnerDetailView.svelte';
	import EditableEffectDetailView from '$lib/components/EditableEffectDetailView.svelte';
	import EditableGoalDetailView from '$lib/components/EditableGoalDetailView.svelte';
	import EditableHelpDetailView from '$lib/components/EditableHelpDetailView.svelte';
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
	import EditableResourceDataDetailView from '$lib/components/EditableResourceDataDetailView.svelte';
	import EditableResourceV2DetailView from '$lib/components/EditableResourceV2DetailView.svelte';
	import EditableRuleDetailView from '$lib/components/EditableRuleDetailView.svelte';
	import EditableTaskDetailView from '$lib/components/EditableTaskDetailView.svelte';
	import EditableTeaserDetailView from '$lib/components/EditableTeaserDetailView.svelte';
	import EditableTextDetailView from '$lib/components/EditableTextDetailView.svelte';
	import EditableTermDetailView from '$lib/components/EditableTermDetailView.svelte';
	import { type AnyContainer, isContainerWithPayloadType, payloadTypes } from '$lib/models';

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

{#if isContainerWithPayloadType(payloadTypes.enum.binary_indicator, container)}
	<EditableBinaryIndicatorDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.content_partner, container)}
	<EditableContentPartnerDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.effect, container)}
	<EditableEffectDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.goal, container)}
	<EditableGoalDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.help, container)}
	<EditableHelpDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.category, container)}
	<EditableCategoryDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.indicator, container)}
	<EditableIndicatorDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.indicator_template, container)}
	<EditableIndicatorTemplateDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.knowledge, container)}
	<EditableKnowledgeDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.measure, container) || isContainerWithPayloadType(payloadTypes.enum.simple_measure, container)}
	<EditableMeasureDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.objective, container)}
	<EditableObjectiveDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.organizational_unit, container)}
	<EditableOrganizationalUnitDetailView bind:container {layout} />
{:else if isContainerWithPayloadType(payloadTypes.enum.organization, container)}
	<EditableOrganizationDetailView bind:container {layout} />
{:else if isContainerWithPayloadType(payloadTypes.enum.page, container)}
	<EditablePageDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.program, container)}
	<EditableProgramDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.report, container)}
	<EditableReportDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.resource, container)}
	<EditableResourceDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.resource_v2, container)}
	<EditableResourceV2DetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.resource_data, container)}
	<EditableResourceDataDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.rule, container)}
	<EditableRuleDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.term, container)}
	<EditableTermDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.task, container)}
	<EditableTaskDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.teaser, container)}
	<EditableTeaserDetailView bind:container {layout} {revisions} />
{:else if isContainerWithPayloadType(payloadTypes.enum.text, container)}
	<EditableTextDetailView bind:container {layout} {revisions} />
{/if}
