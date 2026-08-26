<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import copyContainer from '$lib/client/copyContainer';
	import saveContainer from '$lib/client/saveContainer';
	import Badges from '$lib/components/Badges.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import CategoryProperties from '$lib/components/CategoryProperties.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import EventProperties from '$lib/components/EventProperties.svelte';
	import GoalProperties from '$lib/components/GoalProperties.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import KnowledgeProperties from '$lib/components/KnowledgeProperties.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import OrganizationalUnitProperties from '$lib/components/OrganizationalUnitProperties.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import PostProperties from '$lib/components/PostProperties.svelte';
	import ProgramProperties from '$lib/components/ProgramProperties.svelte';
	import ReportProperties from '$lib/components/ReportProperties.svelte';
	import ResourceProperties from '$lib/components/ResourceProperties.svelte';
	import ResourceV2Properties from '$lib/components/ResourceV2Properties.svelte';
	import ResourceDataProperties from '$lib/components/ResourceDataProperties.svelte';
	import RuleProperties from '$lib/components/RuleProperties.svelte';
	import TaskProperties from '$lib/components/TaskProperties.svelte';
	import TeaserProperties from '$lib/components/TeaserProperties.svelte';
	import TextProperties from '$lib/components/TextProperties.svelte';
	import {
		isCategoryContainer,
		isContainer,
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithTitle,
		isEventContainer,
		isGoalContainer,
		isIndicatorTemplateContainer,
		isKnowledgeContainer,
		isMeasureContainer,
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
		type NewContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import { addItemState, createContainerDialogState } from '$lib/stores';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	async function save(container: NewContainer) {
		const pendingCopy =
			$createContainerDialogState?.kind === 'copy'
				? $createContainerDialogState.request
				: undefined;
		const addItemTarget = $addItemState.target;
		const response = pendingCopy
			? await copyContainer({ ...pendingCopy, rootPayload: container.payload })
			: await saveContainer(container);
		if (response.ok) {
			const savedContainer = await response.json();

			if (addItemTarget) {
				const items = addItemTarget.payload.item.includes(savedContainer.guid)
					? addItemTarget.payload.item
					: [...addItemTarget.payload.item, savedContainer.guid];
				const targetResponse = await saveContainer({
					...addItemTarget,
					payload: {
						...addItemTarget.payload,
						item: items
					}
				});

				if (!targetResponse.ok) {
					const error = await targetResponse.json();
					alert(error.message);
					return;
				}

				const savedTarget = await targetResponse.json();
				Object.assign(addItemTarget, savedTarget);
			}

			if (isOrganizationalUnitContainer(savedContainer)) {
				await goto(resolve('/[guid=uuid]', { guid: savedContainer.guid }), {
					invalidateAll: true
				});
			} else {
				await goto(overlayURL(page.url, overlayKey.enum.view, savedContainer.guid), {
					invalidateAll: true
				});
			}
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	function resetDialogState() {
		$createContainerDialogState = undefined;
		$addItemState = {};
	}

	function handleSubmit(event: SubmitEvent) {
		if (!event.submitter) {
			event.preventDefault();
			return;
		}

		if (event.submitter.classList.contains('button-primary')) {
			if ($createContainerDialogState) {
				save($createContainerDialogState.container);
			}
		}

		dialog.close();
		resetDialogState();
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
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	}
</script>

<dialog bind:this={dialog} onclose={resetDialogState}>
	{#if $createContainerDialogState}
		<form method="dialog" onsubmit={handleSubmit}>
			<p class="dialog-actions">
				<span>{$_('create_container_dialog.title')}</span>
				<button class="button-xs button-primary system-primary" type="submit">
					{$_('save')}
				</button>
				<button class="button-xs button-alternative system-primary" formnovalidate type="submit">
					{$_('cancel')}
				</button>
			</p>

			<article class="details">
				<header class="details-section">
					{#if isContainerWithName($createContainerDialogState.container)}
						<textarea
							aria-label={$_('title')}
							onkeydown={handleKeyDown}
							onkeyup={resizeTextarea}
							placeholder={$_('title')}
							required
							rows="1"
							bind:value={$createContainerDialogState.container.payload.name}
							use:init></textarea>
					{:else if isContainerWithTitle($createContainerDialogState.container)}
						<textarea
							aria-label={$_('title')}
							onkeydown={handleKeyDown}
							onkeyup={resizeTextarea}
							placeholder={$_('title')}
							required
							rows="1"
							bind:value={$createContainerDialogState.container.payload.title}
							use:init></textarea>
					{/if}

					{#if isContainer($createContainerDialogState.container)}
						<Badges bind:container={$createContainerDialogState.container} editable />
					{/if}

					{#if isSimpleMeasureContainer($createContainerDialogState.container)}
						<EditableProgress
							editable
							bind:value={$createContainerDialogState.container.payload.progress}
						/>
					{/if}
				</header>

				{#if isCategoryContainer($createContainerDialogState.container)}
					<CategoryProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isEventContainer($createContainerDialogState.container)}
					<EventProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isGoalContainer($createContainerDialogState.container)}
					<GoalProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isIndicatorTemplateContainer($createContainerDialogState.container)}
					<IndicatorProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isKnowledgeContainer($createContainerDialogState.container)}
					<KnowledgeProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isMeasureContainer($createContainerDialogState.container)}
					<MeasureProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isOrganizationContainer($createContainerDialogState.container)}
					<OrganizationProperties bind:container={$createContainerDialogState.container} editable />
				{:else if isOrganizationalUnitContainer($createContainerDialogState.container)}
					<OrganizationalUnitProperties
						bind:container={$createContainerDialogState.container}
						editable
					/>
				{:else if isPostContainer($createContainerDialogState.container)}
					<PostProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isProgramContainer($createContainerDialogState.container)}
					<ProgramProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isReportContainer($createContainerDialogState.container)}
					<ReportProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isResourceContainer($createContainerDialogState.container)}
					<ResourceProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isResourceV2Container($createContainerDialogState.container)}
					<ResourceV2Properties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isResourceDataContainer($createContainerDialogState.container)}
					<ResourceDataProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isRuleContainer($createContainerDialogState.container)}
					<RuleProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isSimpleMeasureContainer($createContainerDialogState.container)}
					<MeasureProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isTaskContainer($createContainerDialogState.container)}
					<TaskProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isTeaserContainer($createContainerDialogState.container)}
					<TeaserProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isTextContainer($createContainerDialogState.container)}
					<TextProperties
						bind:container={$createContainerDialogState.container}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{/if}

				{#if isContainerWithDescription($createContainerDialogState.container)}
					<EditableFormattedText
						editable
						label={$_('description')}
						bind:value={$createContainerDialogState.container.payload.description}
					/>
				{:else if isContainerWithBody($createContainerDialogState.container)}
					<EditableFormattedText
						editable
						label={$_('body')}
						bind:value={$createContainerDialogState.container.payload.body}
					/>
				{/if}
			</article>
		</form>
	{/if}
</dialog>

<style>
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
		margin-left: auto;
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
