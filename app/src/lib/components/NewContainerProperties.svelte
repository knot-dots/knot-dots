<script lang="ts">
	import {
		isBinaryIndicatorContainer,
		isCategoryContainer,
		isEffectContainer,
		isEventContainer,
		isGoalContainer,
		isIndicatorTemplateContainer,
		isKnowledgeContainer,
		isMeasureContainer,
		isObjectiveContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isPostContainer,
		isProgramContainer,
		isReportContainer,
		isResourceContainer,
		isResourceDataContainer,
		isResourceV2Container,
		isRuleContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		isTeaserContainer,
		isTextContainer,
		type NewContainer
	} from '$lib/models';
	import BinaryIndicatorProperties from './BinaryIndicatorProperties.svelte';
	import CategoryProperties from './CategoryProperties.svelte';
	import EffectProperties from './EffectProperties.svelte';
	import EventProperties from './EventProperties.svelte';
	import GoalProperties from './GoalProperties.svelte';
	import IndicatorProperties from './IndicatorProperties.svelte';
	import KnowledgeProperties from './KnowledgeProperties.svelte';
	import MeasureProperties from './MeasureProperties.svelte';
	import ObjectiveProperties from './ObjectiveProperties.svelte';
	import OrganizationalUnitProperties from './OrganizationalUnitProperties.svelte';
	import OrganizationProperties from './OrganizationProperties.svelte';
	import PostProperties from './PostProperties.svelte';
	import ProgramProperties from './ProgramProperties.svelte';
	import ReportProperties from './ReportProperties.svelte';
	import ResourceDataProperties from './ResourceDataProperties.svelte';
	import ResourceProperties from './ResourceProperties.svelte';
	import ResourceV2Properties from './ResourceV2Properties.svelte';
	import RuleProperties from './RuleProperties.svelte';
	import TaskProperties from './TaskProperties.svelte';
	import TeaserProperties from './TeaserProperties.svelte';
	import TextProperties from './TextProperties.svelte';

	interface Props {
		container: NewContainer;
	}

	let { container = $bindable() }: Props = $props();
</script>

{#if isBinaryIndicatorContainer(container)}
	<BinaryIndicatorProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isCategoryContainer(container)}
	<CategoryProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isEffectContainer(container)}
	<EffectProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isEventContainer(container)}
	<EventProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isGoalContainer(container)}
	<GoalProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isIndicatorTemplateContainer(container)}
	<IndicatorProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isKnowledgeContainer(container)}
	<KnowledgeProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isMeasureContainer(container)}
	<MeasureProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isObjectiveContainer(container)}
	<ObjectiveProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isOrganizationContainer(container)}
	<OrganizationProperties bind:container editable />
{:else if isOrganizationalUnitContainer(container)}
	<OrganizationalUnitProperties bind:container editable />
{:else if isPostContainer(container)}
	<PostProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isProgramContainer(container)}
	<ProgramProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isReportContainer(container)}
	<ReportProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isResourceContainer(container)}
	<ResourceProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isResourceV2Container(container)}
	<ResourceV2Properties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isResourceDataContainer(container)}
	<ResourceDataProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isRuleContainer(container)}
	<RuleProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isSimpleMeasureContainer(container)}
	<MeasureProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isTaskContainer(container)}
	<TaskProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isTeaserContainer(container)}
	<TeaserProperties bind:container editable relatedContainers={[]} revisions={[]} />
{:else if isTextContainer(container)}
	<TextProperties bind:container editable relatedContainers={[]} revisions={[]} />
{/if}
