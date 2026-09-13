<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AskAI from '~icons/knotdots/ask-ai';
	import InlineGoalTypeDropdown from '$lib/components/InlineGoalTypeDropdown.svelte';
	import InlineMeasureTypeDropdown from '$lib/components/InlineMeasureTypeDropdown.svelte';
	import InlineProgramTypeDropdown from '$lib/components/InlineProgramTypeDropdown.svelte';
	import InlineStatusDropdown from '$lib/components/InlineStatusDropdown.svelte';
	import InlineTaskCategoryDropdown from '$lib/components/InlineTaskCategoryDropdown.svelte';
	import {
		type Container,
		type Status,
		isContainerWithStatus,
		isGoalContainer,
		isRuleContainer,
		isTaskContainer,
		status,
		isResourceDataContainer,
		payloadTypes,
		type PayloadType,
		isSimpleMeasureContainer,
		isMeasureContainer,
		isProgramContainer
	} from '$lib/models';

	interface Props {
		container: Container;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	let statusOptions = $derived.by(() => {
		if (isGoalContainer(container) || isTaskContainer(container)) {
			return status.options.filter((s) => s !== 'status.in_operation');
		}
		return status.options;
	});

	function statusLabelFn(s: Status): string {
		if (s === 'status.in_operation') {
			return isRuleContainer(container)
				? $_('status.in_application')
				: $_('status.in_operation.short');
		}
		return $_(s);
	}

	const moduleByType = new Map<PayloadType, string>([
		[payloadTypes.enum.binary_indicator, 'impact-measurement'],
		[payloadTypes.enum.category, 'organizing'],
		[payloadTypes.enum.effect, 'impact-measurement'],
		[payloadTypes.enum.goal, 'goal-setting'],
		[payloadTypes.enum.help, 'knowledge-transfer'],
		[payloadTypes.enum.indicator_template, 'impact-measurement'],
		[payloadTypes.enum.knowledge, 'knowledge-transfer'],
		[payloadTypes.enum.measure, 'implementation-planning'],
		[payloadTypes.enum.objective, 'impact-measurement'],
		[payloadTypes.enum.page, 'organizing'],
		[payloadTypes.enum.program, 'goal-setting'],
		[payloadTypes.enum.report, 'impact-measurement'],
		[payloadTypes.enum.resource, 'resource-planning'],
		[payloadTypes.enum.resource_data, 'resource-planning'],
		[payloadTypes.enum.resource_v2, 'resource-planning'],
		[payloadTypes.enum.rule, 'rules'],
		[payloadTypes.enum.simple_measure, 'implementation-planning'],
		[payloadTypes.enum.task, 'implementation-planning'],
		[payloadTypes.enum.term, 'organizing']
	]);
</script>

<ul class="badges">
	<li class="module-{moduleByType.get(container.payload.type)}">
		{#if container.payload.type === 'category'}
			<span class="badge">{$_('categories.columns.root')}</span>
		{:else if isGoalContainer(container)}
			<InlineGoalTypeDropdown bind:value={container.payload.goalType} {editable} />
		{:else if isMeasureContainer(container) || isSimpleMeasureContainer(container)}
			<InlineMeasureTypeDropdown bind:value={container.payload.measureType} {editable} />
		{:else if isProgramContainer(container)}
			<InlineProgramTypeDropdown bind:value={container.payload.programType} {editable} />
		{:else if isTaskContainer(container)}
			<InlineTaskCategoryDropdown bind:value={container.payload.taskCategory} {editable} />
		{:else if isResourceDataContainer(container)}
			<span class="badge">{$_(container.payload.resourceDataType)}</span>
		{:else}
			<span class="badge">{$_(container.payload.type)}</span>
		{/if}
	</li>

	{#if 'aiContribution' in container.payload && container.payload.aiContribution > 0}
		<li>
			<span class="badge badge--yellow">
				<AskAI />
				{container.payload.aiContribution == 1 ? $_('ai_generated') : $_('ai_assisted')}
			</span>
		</li>
	{/if}

	{#if isContainerWithStatus(container)}
		<li>
			<InlineStatusDropdown
				{editable}
				labelFn={statusLabelFn}
				options={statusOptions}
				bind:value={container.payload.status}
			/>
		</li>
	{/if}
</ul>

<style>
	.badges {
		--badge-border-radius: 6px;
		--badge-border-width: 1px;
		--badge-min-height: 1.75rem;
		--badge-padding-x: 0.5rem;
		--dropdown-button-border-radius: 0;
		--dropdown-button-default-background: transparent;
		--dropdown-button-padding-x: 0.25rem;
		--dropdown-button-padding-y: 0.25rem;
		--form-control-border: solid 1px var(--color-border-raised);
		--form-control-border-radius: 6px;
		--form-control-min-height: 1.75rem;
		--form-control-padding-x: 0.5rem;

		display: flex;
		padding: 0.375rem 0 0.75rem;
	}

	li {
		display: contents;
	}

	li > :global(.badge) {
		height: 1.75rem;
		margin: 0.25rem;
	}
</style>
