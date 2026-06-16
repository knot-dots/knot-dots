<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { deepEqual } from 'ts-deep-equal';
	import AskAI from '~icons/knotdots/ask-ai';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import {
		type AnyContainer,
		type AnyPayload,
		type Container,
		isContainerWithStatus,
		isGoalContainer,
		isResourceDataContainer,
		isRuleContainer,
		isSuggestedByAI,
		isTaskContainer,
		programTypes,
		type Status,
		status
	} from '$lib/models';

	interface Props {
		container: Container;
		revisions?: AnyContainer[];
		editable?: boolean;
	}

	let { container = $bindable(), revisions = [], editable = false }: Props = $props();

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

	function hasBeenModified(originalPayload: AnyPayload, currentPayload: AnyPayload): boolean {
		return !deepEqual(originalPayload, currentPayload);
	}
</script>

<ul class="badges">
	<li class="badge badge--purple">
		{#if container.payload.type === 'category'}
			{$_('categories.columns.root')}
		{:else if 'goalType' in container.payload && container.payload.goalType}
			{$_(container.payload.goalType as string)}
		{:else if 'measureType' in container.payload && container.payload.measureType?.length}
			{$_(
				(Array.isArray(container.payload.measureType)
					? container.payload.measureType[0]
					: container.payload.measureType) as string
			)}
		{:else if 'programType' in container.payload && container.payload.programType !== programTypes.enum['program_type.misc']}
			{$_(container.payload.programType as string)}
		{:else if 'taskCategory' in container.payload && container.payload.taskCategory}
			{$_(container.payload.taskCategory as string)}
		{:else if isResourceDataContainer(container)}
			{$_(container.payload.resourceDataType)}
		{:else}
			{$_(container.payload.type)}
		{/if}
	</li>
	{#if isSuggestedByAI(container)}
		<li class="badge badge--yellow">
			<AskAI />
			{revisions.length > 1 && hasBeenModified(revisions[0].payload, container.payload)
				? $_('ai_assisted')
				: $_('ai_generated')}
		</li>
	{/if}
	{#if isContainerWithStatus(container)}
		<li>
			<StatusDropdown
				buttonStyle="badge"
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
		--dropdown-button-border-radius: 6px;
		--dropdown-button-padding: 0;

		display: flex;
		gap: 0.5rem;
		line-height: 1;
		padding: 0.375rem 0 0.75rem;
	}
</style>
