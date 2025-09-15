<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import createEffect from '$lib/client/createEffect';
	import saveContainer from '$lib/client/saveContainer';
	import Badges from '$lib/components/Badges.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import GoalProperties from '$lib/components/GoalProperties.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import KnowledgeProperties from '$lib/components/KnowledgeProperties.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import OrganizationalUnitProperties from '$lib/components/OrganizationalUnitProperties.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import ProgramProperties from '$lib/components/ProgramProperties.svelte';
	import ResourceProperties from '$lib/components/ResourceProperties.svelte';
	import RuleProperties from '$lib/components/RuleProperties.svelte';
	import TaskProperties from '$lib/components/TaskProperties.svelte';
	import TextProperties from '$lib/components/TextProperties.svelte';
	import {
		isContainer,
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithProgress,
		isContainerWithTitle,
		isGoalContainer,
		isIndicatorContainer,
		isKnowledgeContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isProgramContainer,
		isResourceContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		isTextContainer,
		type NewContainer,
		overlayKey,
		overlayURL,
		status
	} from '$lib/models';
	import { addEffectState, newContainer } from '$lib/stores';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	async function save(container: NewContainer) {
		const response = await saveContainer(container);
		if (response.ok) {
			const savedContainer = await response.json();
			if (isIndicatorContainer(savedContainer) && $addEffectState.target) {
				const effect = await createEffect($addEffectState.target, savedContainer);
				$addEffectState = {};
				await goto(`#view=${effect.guid}`);
			} else if (isOrganizationalUnitContainer(savedContainer)) {
				await goto(resolve('/[[guid=uuid]]/all/page', { guid: savedContainer.guid }));
			} else {
				await goto(overlayURL(page.url, overlayKey.enum.view, savedContainer.guid));
			}
			await invalidateAll();
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

			<article class="details">
				<header class="details-section">
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

					{#if isContainer($newContainer)}
						<Badges bind:container={$newContainer} editable />
					{/if}

					{#if isContainerWithProgress($newContainer)}
						<EditableProgress editable bind:value={$newContainer.payload.progress} />
					{/if}
				</header>

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
				{:else if isResourceContainer($newContainer)}
					<ResourceProperties
						bind:container={$newContainer}
						editable
						relatedContainers={[]}
						revisions={[]}
					/>
				{:else if isRuleContainer($newContainer)}
					<RuleProperties
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
				{:else if isProgramContainer($newContainer)}
					<ProgramProperties
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
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

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
