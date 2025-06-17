<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import AskAI from '~icons/knotdots/ask-ai';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import {
		type AnyContainer,
		type Container,
		isContainerWithProgress,
		isContainerWithStatus,
		isResolutionContainer,
		isSuggestedByAI,
		isTaskContainer,
		strategyTypes
	} from '$lib/models';
	import { applicationState } from '$lib/stores';
	import {
		resolutionStatusColors,
		resolutionStatusIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';

	interface Props {
		container: Container;
		data?: Snippet;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), data, relatedContainers, revisions }: Props = $props();

	const handleSubmit = autoSave(container, 2000);
</script>

<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
	<article class="details details-editable">
		<div class="details-tab" id="basic-data">
			{#if $applicationState.containerDetailView.editable}
				<h2
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.title}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h2>
			{:else}
				<h2 class="details-title" contenteditable="false">
					{container.payload.title}
				</h2>
			{/if}

			<ul class="badges">
				<li class="badge badge--purple">
					{#if 'goalType' in container.payload && container.payload.goalType}
						{$_(container.payload.goalType)}
					{:else if 'strategyType' in container.payload && container.payload.strategyType !== strategyTypes.enum['strategy_type.misc']}
						{$_(container.payload.strategyType)}
					{:else}
						{$_(container.payload.type)}
					{/if}
				</li>
				{#if isSuggestedByAI(container)}
					<li class="badge badge--yellow"><AskAI />{$_('ai_suggestion')}</li>
				{/if}
				{#if isContainerWithStatus(container)}
					{@const StatusIcon = statusIcons.get(container.payload.status)}
					{#key container.payload.status}
						<li class="badge badge--{statusColors.get(container.payload.status)}">
							<StatusIcon />
							{$_(container.payload.status)}
						</li>
					{/key}
				{:else if isTaskContainer(container)}
					{@const TaskStatusIcon = taskStatusIcons.get(container.payload.taskStatus)}
					{#key container.payload.taskStatus}
						<li class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
							<TaskStatusIcon />
							{$_(container.payload.taskStatus)}
						</li>
					{/key}
				{:else if isResolutionContainer(container)}
					{@const ResolutionStatusIcon = resolutionStatusIcons.get(
						container.payload.resolutionStatus
					)}
					{#key container.payload.resolutionStatus}
						<li
							class="badge badge--{resolutionStatusColors.get(container.payload.resolutionStatus)}"
						>
							<ResolutionStatusIcon />
							{$_(container.payload.resolutionStatus)}
						</li>
					{/key}
				{/if}
			</ul>

			{#if isContainerWithProgress(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.progress}
					compact
				/>
			{/if}
		</div>

		{@render data?.()}
	</article>
</form>

<style>
	.badges {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding: 0.375rem 0 0.75rem;
	}
</style>
