<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import AskAI from '~icons/knotdots/ask-ai';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import ResolutionStatusDropdown from '$lib/components/ResolutionStatusDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
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
					<li>
						<StatusDropdown
							buttonStyle="badge"
							editable={$applicationState.containerDetailView.editable}
							bind:value={container.payload.status}
						/>
					</li>
				{:else if isTaskContainer(container)}
					<li>
						<TaskStatusDropdown
							buttonStyle="badge"
							editable={$applicationState.containerDetailView.editable}
							bind:value={container.payload.taskStatus}
						/>
					</li>
				{:else if isResolutionContainer(container)}
					<li>
						<ResolutionStatusDropdown
							buttonStyle="badge"
							editable={$applicationState.containerDetailView.editable}
							bind:value={container.payload.resolutionStatus}
						/>
					</li>
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
		--dropdown-button-border-radius: 6px;
		--dropdown-button-padding: 0;

		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding: 0.375rem 0 0.75rem;
	}
</style>
