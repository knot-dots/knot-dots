<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AskAI from '~icons/knotdots/ask-ai';
	import GoalStatusDropdown from '$lib/components/GoalStatusDropdown.svelte';
	import ProgramStatusDropdown from '$lib/components/ProgramStatusDropdown.svelte';
	import RuleStatusDropdown from '$lib/components/RuleStatusDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
	import {
		type GoalType,
		type Container,
		isContainerWithStatus,
		isGoalContainer,
		isProgramContainer,
		isRuleContainer,
		isSuggestedByAI,
		isTaskContainer,
		programTypes,
		type ProgramType,
		type TaskCategory
	} from '$lib/models';

	interface Props {
		container: Container;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

<ul class="badges">
	<li class="badge badge--purple">
		{#if container.payload.type === 'category'}
			{$_('categories.columns.root')}
		{:else if 'goalType' in container.payload && container.payload.goalType}
			{@const goalType = container.payload.goalType as GoalType}
			{$_(goalType)}
		{:else if 'programType' in container.payload && container.payload.programType !== programTypes.enum['program_type.misc']}
			{@const programType = container.payload.programType as ProgramType}
			{$_(programType)}
		{:else if 'taskCategory' in container.payload && container.payload.taskCategory}
			{@const taskCategory = container.payload.taskCategory as TaskCategory}
			{$_(taskCategory)}
		{:else}
			{$_(container.payload.type)}
		{/if}
	</li>
	{#if isSuggestedByAI(container)}
		<li class="badge badge--yellow"><AskAI />{$_('ai_suggestion')}</li>
	{/if}
	{#if isContainerWithStatus(container)}
		<li>
			<StatusDropdown buttonStyle="badge" {editable} bind:value={container.payload.status} />
		</li>
	{:else if isTaskContainer(container)}
		<li>
			<TaskStatusDropdown
				buttonStyle="badge"
				{editable}
				bind:value={container.payload.taskStatus}
			/>
		</li>
	{:else if isRuleContainer(container)}
		<li>
			<RuleStatusDropdown
				buttonStyle="badge"
				{editable}
				bind:value={container.payload.ruleStatus}
			/>
		</li>
	{:else if isGoalContainer(container)}
		<li>
			<GoalStatusDropdown
				buttonStyle="badge"
				{editable}
				bind:value={container.payload.goalStatus}
			/>
		</li>
	{:else if isProgramContainer(container)}
		<li>
			<ProgramStatusDropdown
				buttonStyle="badge"
				{editable}
				bind:value={container.payload.programStatus}
			/>
		</li>
	{/if}
</ul>

<style>
	.badges {
		--dropdown-button-border-radius: 6px;
		--dropdown-button-padding: 0;

		display: flex;
		gap: 0.5rem;
		line-height: 1;
		padding: 0.375rem 0 0.75rem;
	}
</style>
