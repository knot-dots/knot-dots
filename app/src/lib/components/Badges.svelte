<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AskAI from '~icons/knotdots/ask-ai';
	import RuleStatusDropdown from '$lib/components/RuleStatusDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
	import {
		type Container,
		isContainerWithStatus,
		isRuleContainer,
		isSuggestedByAI,
		isTaskContainer,
		programTypes
	} from '$lib/models';

	interface Props {
		container: Container;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

<ul class="badges">
	<li class="badge badge--purple">
		{#if 'goalType' in container.payload && container.payload.goalType}
			{$_(container.payload.goalType)}
		{:else if 'programType' in container.payload && container.payload.programType !== programTypes.enum['program_type.misc']}
			{$_(container.payload.programType)}
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
	{/if}
</ul>

<style>
	.badges {
		--dropdown-button-border-radius: 6px;
		--dropdown-button-padding: 0;

		display: flex;
		gap: 0.5rem;
		padding: 0.375rem 0 0.75rem;
	}
</style>
