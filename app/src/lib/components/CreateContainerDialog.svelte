<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import GoalProperties from '$lib/components/GoalProperties.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import KnowledgeProperties from '$lib/components/KnowledgeProperties.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import OrganizationalUnitProperties from '$lib/components/OrganizationalUnitProperties.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import ResolutionProperties from '$lib/components/ResolutionProperties.svelte';
	import ResourceProperties from '$lib/components/ResourceProperties.svelte';
	import StrategyProperties from '$lib/components/StrategyProperties.svelte';
	import TaskProperties from '$lib/components/TaskProperties.svelte';
	import TextProperties from '$lib/components/TextProperties.svelte';
	import {
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithProgress,
		isContainerWithStatus,
		isContainerWithTitle,
		isGoalContainer,
		isIndicatorContainer,
		isKnowledgeContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isResolutionContainer,
		isResourceContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		isTaskContainer,
		isTextContainer,
		type NewContainer,
		overlayKey,
		overlayURL,
		status,
		strategyTypes
	} from '$lib/models';
	import { newContainer } from '$lib/stores';
	import {
		resolutionStatusColors,
		resolutionStatusIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	async function save(container: NewContainer) {
		const response = await saveContainer(container);
		if (response.ok) {
			const savedContainer = await response.json();
			await invalidateAll();
			await goto(overlayURL(page.url, overlayKey.enum.view, savedContainer.guid));
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	function handleSubmit(event: SubmitEvent) {
		if (!event.submitter) {
			event.preventDefault();
			return;
		}

		if (event.submitter.classList.contains('button-primary')) {
			save($newContainer as NewContainer);
		}

		dialog.close();
		$newContainer = undefined;
	}

	function resizeTextarea(event: Event) {
		(event.currentTarget as HTMLTextAreaElement).style.height = 'auto';
		(event.currentTarget as HTMLTextAreaElement).style.height =
			`${(event.currentTarget as HTMLTextAreaElement).scrollHeight}px`;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(
				(event.currentTarget as HTMLTextAreaElement)
					.closest('form')
					?.querySelector('.button-primary') as HTMLButtonElement | null
			)?.click();
		}
	}

	function init(element: HTMLElement) {
		element.focus();
	}
</script>

<dialog bind:this={dialog}>
	{#if $newContainer}
		<form method="dialog" onsubmit={handleSubmit}>
			<p class="dialog-actions">
				<span>{$_('create_container_dialog.title')}</span>
				<button class="button-xs button-primary" type="submit">
					{$_('save')}
				</button>
				<button class="button-xs button-alternative" formnovalidate type="submit">
					{$_('cancel')}
				</button>
			</p>

			<article class="details details-editable">
				<div class="details-tab" id="basic-data">
					{#if isContainerWithName($newContainer)}
						<textarea
							onkeydown={handleKeyDown}
							onkeyup={resizeTextarea}
							placeholder={$_('title')}
							required
							rows="1"
							bind:value={$newContainer.payload.name}
							use:init
						></textarea>
					{:else if isContainerWithTitle($newContainer)}
						<textarea
							onkeydown={handleKeyDown}
							onkeyup={resizeTextarea}
							placeholder={$_('title')}
							required
							rows="1"
							bind:value={$newContainer.payload.title}
							use:init
						></textarea>
					{/if}

					<ul class="badges">
						<li class="badge badge--purple">
							{#if 'goalType' in $newContainer.payload && $newContainer.payload.goalType}
								{$_($newContainer.payload.goalType)}
							{:else if 'strategyType' in $newContainer.payload && $newContainer.payload.strategyType !== strategyTypes.enum['strategy_type.misc']}
								{$_($newContainer.payload.strategyType)}
							{:else}
								{$_($newContainer.payload.type)}
							{/if}
						</li>
						{#if isContainerWithStatus($newContainer)}
							{@const StatusIcon = statusIcons.get($newContainer.payload.status)}
							{#key $newContainer.payload.status}
								<li class="badge badge--{statusColors.get($newContainer.payload.status)}">
									<StatusIcon />
									{$_($newContainer.payload.status)}
								</li>
							{/key}
						{:else if isTaskContainer($newContainer)}
							{@const TaskStatusIcon = taskStatusIcons.get($newContainer.payload.taskStatus)}
							{#key $newContainer.payload.taskStatus}
								<li class="badge badge--{taskStatusColors.get($newContainer.payload.taskStatus)}">
									<TaskStatusIcon />
									{$_($newContainer.payload.taskStatus)}
								</li>
							{/key}
						{:else if isResolutionContainer($newContainer)}
							{@const ResolutionStatusIcon = resolutionStatusIcons.get(
								$newContainer.payload.resolutionStatus
							)}
							{#key $newContainer.payload.resolutionStatus}
								<li
									class="badge badge--{resolutionStatusColors.get(
										$newContainer.payload.resolutionStatus
									)}"
								>
									<ResolutionStatusIcon />
									{$_($newContainer.payload.resolutionStatus)}
								</li>
							{/key}
						{/if}
					</ul>

					{#if isContainerWithProgress($newContainer)}
						<EditableProgress compact editable bind:value={$newContainer.payload.progress} />
					{/if}
				</div>

				{#if isGoalContainer($newContainer)}
					<GoalProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isIndicatorContainer($newContainer)}
					<IndicatorProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isKnowledgeContainer($newContainer)}
					<KnowledgeProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isMeasureContainer($newContainer)}
					<MeasureProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isOrganizationContainer($newContainer)}
					<OrganizationProperties bind:container={$newContainer} editable />
				{:else if isOrganizationalUnitContainer($newContainer)}
					<OrganizationalUnitProperties bind:container={$newContainer} editable />
				{:else if isResolutionContainer($newContainer)}
					<ResolutionProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isResourceContainer($newContainer)}
					<ResourceProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isSimpleMeasureContainer($newContainer)}
					<MeasureProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isStrategyContainer($newContainer)}
					<StrategyProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isTaskContainer($newContainer)}
					<TaskProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isTextContainer($newContainer)}
					<TextProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{/if}

				{#if isContainerWithDescription($newContainer)}
					<EditableFormattedText
						editable
						label={$_('description')}
						bind:value={$newContainer.payload.description}
					/>
				{:else if isContainerWithBody($newContainer)}
					<EditableFormattedText
						editable
						label={$_('body')}
						bind:value={$newContainer.payload.body}
					/>
				{/if}

				{#if (isMeasureContainer($newContainer) && $newContainer.payload.status === status.enum['status.in_planning']) || isSimpleMeasureContainer($newContainer)}
					<EditableFormattedText
						editable
						label={$_('annotation')}
						bind:value={$newContainer.payload.annotation}
					/>
				{:else if isMeasureContainer($newContainer) && $newContainer.payload.status === status.enum['status.in_implementation']}
					<EditableFormattedText
						editable
						label={$_('comment')}
						bind:value={$newContainer.payload.comment}
					/>
				{:else if isMeasureContainer($newContainer) && ($newContainer.payload.status === status.enum['status.in_operation'] || $newContainer.payload.status === status.enum['status.done'])}
					<EditableFormattedText
						editable
						label={$_('result')}
						bind:value={$newContainer.payload.result}
					/>
				{/if}
			</article>
		</form>
	{/if}
</dialog>

<style>
	article {
		overflow: auto;
		padding: 1.5rem 0;
	}

	@media (min-width: 768px) {
		article {
			padding: 3rem 0;
		}
	}

	dialog {
		width: calc(min(54rem, 100vw));
	}

	dialog > * {
		min-width: 30rem;
	}

	textarea {
		background-color: white;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-900);
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.25;
		margin: 0 -0.5rem;
		min-height: revert;
		overflow: hidden;
		padding: 0.5rem;
		resize: none;
		width: calc(100% + 1rem);
	}

	textarea:invalid {
		background-color: var(--color-red-100);
	}

	.button-primary {
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		margin-left: auto;
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.375rem 0 0.75rem;
	}

	.dialog-actions {
		align-items: center;
		background-color: white;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.dialog-actions span {
		color: var(--color-gray-500);
	}
</style>
