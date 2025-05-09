<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowDown from '~icons/heroicons/arrow-down-16-solid';
	import ArrowUp from '~icons/heroicons/arrow-up-16-solid';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import EditableAmount from '$lib/components/EditableAmount.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableBenefit from '$lib/components/EditableBenefit.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableChapterType from '$lib/components/EditableChapterType.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableDuration from '$lib/components/EditableDuration.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableFile from '$lib/components/EditableFile.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditableLevel from '$lib/components/EditableLevel.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationCategory from '$lib/components/EditableOrganizationCategory.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePDF from '$lib/components/EditablePDF.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import EditableResolutionStatus from '$lib/components/EditableResolutionStatus.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableStrategyType from '$lib/components/EditableStrategyType.svelte';
	import EditableSuperordinateOrganizationalUnit from '$lib/components/EditableSuperordinateOrganizationalUnit.svelte';
	import EditableTaskCategory from '$lib/components/EditableTaskCategory.svelte';
	import EditableTaskStatus from '$lib/components/EditableTaskStatus.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableUnit from '$lib/components/EditableUnit.svelte';
	import EditableValidFrom from '$lib/components/EditableValidFrom.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import {
		isContainer,
		isContainerWithAudience,
		isContainerWithBody,
		isContainerWithCategory,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithProgress,
		isContainerWithStatus,
		isContainerWithTitle,
		isContainerWithTopic,
		isMeasureContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		isModelContainer,
		isOperationalGoalContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isResolutionContainer,
		isResourceContainer,
		isSimpleMeasureContainer,
		isStrategicGoalContainer,
		isStrategyContainer,
		isTaskContainer,
		isVisionContainer,
		type NewContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import { ability, newContainer } from '$lib/stores';
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

	const disclosure = createDisclosure();

	let disclosure_expanded = $state($disclosure.expanded);

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
						<li class="badge badge--purple">{$_($newContainer.payload.type)}</li>
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

					<p class="section-label" id="properties-label">{$_('properties')}</p>
					<section class="data-grid" aria-labelledby="properties-label">
						<div class="label">{$_('created_date')}</div>
						<div class="value value--read-only">
							{$_('empty')}
						</div>

						<div class="label">{$_('modified_date')}</div>
						<div class="value value--read-only">
							{$_('empty')}
						</div>

						{#if $ability.can('update', $newContainer, 'visibility')}
							<EditableVisibility editable bind:value={$newContainer.payload.visibility} />
						{/if}
					</section>

					{#if $disclosure.expanded}
						<div
							class="data-grid"
							onintroend={() => {
								disclosure_expanded = true;
							}}
							onoutroend={() => {
								disclosure_expanded = false;
							}}
							transition:slide={{ duration: 125, easing: cubicInOut }}
							use:disclosure.panel
						>
							{#if isMeasureContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableDuration editable bind:container={$newContainer} />
								<EditableStatus editable bind:value={$newContainer.payload.status} />
								<EditableMeasureType editable bind:value={$newContainer.payload.measureType} />
								<EditableStrategy editable bind:container={$newContainer} />
								<EditableParent editable bind:container={$newContainer} />
							{:else if isMeasureResultContainer($newContainer)}
								<EditableDate
									editable
									label={$_('fulfillment_date')}
									bind:value={$newContainer.payload.fulfillmentDate}
								/>
								<EditableMeasure container={$newContainer} editable />
							{:else if isMilestoneContainer($newContainer)}
								<EditableDate
									editable
									label={$_('fulfillment_date')}
									bind:value={$newContainer.payload.fulfillmentDate}
								/>
								<EditableMeasure container={$newContainer} editable />
							{:else if isModelContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableStrategy editable bind:container={$newContainer} />
							{:else if isOperationalGoalContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableDate
									editable
									label={$_('fulfillment_date')}
									bind:value={$newContainer.payload.fulfillmentDate}
								/>
								<EditableStrategy container={$newContainer} editable />
							{:else if isOrganizationContainer($newContainer)}
								<EditableOrganizationCategory
									editable
									bind:value={$newContainer.payload.organizationCategory}
								/>
								<EditableMultipleChoice
									editable
									label={$_('boards')}
									options={['board.indicators', 'board.organizational_units'].map((o) => ({
										value: o,
										label: $_(o)
									}))}
									bind:value={$newContainer.payload.boards}
								/>
							{:else if isOrganizationalUnitContainer($newContainer)}
								{#if $ability.can('update', $newContainer)}
									<EditableNumber
										editable
										label={$_('organizational_unit.level')}
										bind:value={$newContainer.payload.level}
									/>
								{/if}
								<EditableSuperordinateOrganizationalUnit container={$newContainer} editable />
								<EditableMultipleChoice
									editable
									label={$_('boards')}
									options={['board.indicators'].map((o) => ({
										value: o,
										label: $_(o)
									}))}
									bind:value={$newContainer.payload.boards}
								/>
							{:else if isResolutionContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableValidFrom editable bind:container={$newContainer} />
								<EditableResolutionStatus
									editable
									bind:value={$newContainer.payload.resolutionStatus}
								/>
								<EditableStrategy editable bind:container={$newContainer} />
							{:else if isResourceContainer($newContainer)}
								<EditableAmount editable bind:value={$newContainer.payload.amount} />
								<EditableUnit editable bind:value={$newContainer.payload.unit} />
								<EditableDate
									editable
									label={$_('fulfillment_date')}
									bind:value={$newContainer.payload.fulfillmentDate}
								/>
							{:else if isSimpleMeasureContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableFile editable bind:value={$newContainer.payload.file} />
								<EditableDuration editable bind:container={$newContainer} />
								<EditableStatus editable bind:value={$newContainer.payload.status} />
								<EditableMeasureType editable bind:value={$newContainer.payload.measureType} />
								<EditableStrategy editable bind:container={$newContainer} />
								<EditableParent editable bind:container={$newContainer} />
							{:else if isStrategicGoalContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableDate
									editable
									label={$_('fulfillment_date')}
									bind:value={$newContainer.payload.fulfillmentDate}
								/>
								<EditableStrategy editable bind:container={$newContainer} />
								<EditableParent editable bind:container={$newContainer} />
							{:else if isStrategyContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableLevel editable bind:value={$newContainer.payload.level} />
								<EditableStrategyType editable bind:value={$newContainer.payload.strategyType} />
								<EditableImage
									editable
									label={$_('cover')}
									bind:value={$newContainer.payload.image}
								/>
								<EditablePDF editable bind:value={$newContainer.payload.pdf} />
								<EditableChapterType editable bind:value={$newContainer.payload.chapterType} />
							{:else if isTaskContainer($newContainer)}
								<EditableTaskStatus editable bind:value={$newContainer.payload.taskStatus} />
								<EditableTaskCategory editable bind:value={$newContainer.payload.taskCategory} />
								<EditableDate
									editable
									label={$_('fulfillment_date')}
									bind:value={$newContainer.payload.fulfillmentDate}
								/>
								<EditableBenefit editable bind:value={$newContainer.payload.benefit} />
								<EditablePlainText
									editable
									label={$_('effort')}
									bind:value={$newContainer.payload.effort}
								/>
								<EditableMeasure editable bind:container={$newContainer} />
								<EditableParent editable bind:container={$newContainer} />
							{:else if isVisionContainer($newContainer)}
								{#if $ability.can('read', $newContainer, 'payload.editorialState')}
									<EditableEditorialState
										editable={$ability.can('update', $newContainer, 'payload.editorialState')}
										bind:value={$newContainer.payload.editorialState}
									/>
								{/if}
								<EditableStrategy bind:container={$newContainer} editable />
							{/if}

							{#if isContainerWithTopic($newContainer)}
								<EditableTopic editable bind:value={$newContainer.payload.topic} />
							{/if}

							{#if isContainerWithCategory($newContainer)}
								<EditableCategory editable bind:value={$newContainer.payload.category} />
							{/if}

							{#if isContainerWithAudience($newContainer)}
								<EditableAudience editable bind:value={$newContainer.payload.audience} />
							{/if}

							{#if isContainer($newContainer)}
								<EditableOrganization
									editable={$ability.can('update', $newContainer.payload.type, 'organization')}
									bind:value={$newContainer.organization}
								/>
								<EditableOrganizationalUnit
									editable={$ability.can(
										'update',
										$newContainer.payload.type,
										'organizational_unit'
									)}
									organization={$newContainer.organization}
									bind:value={$newContainer.organizational_unit}
								/>
							{/if}
						</div>
					{/if}

					<button class="button-disclosure" type="button" use:disclosure.button>
						{#if disclosure_expanded}
							<ArrowUp /> {$_('properties.hide')}
						{:else}
							<ArrowDown /> {$_('properties.show_all')}
						{/if}
					</button>
				</div>

				<div class="details-tab">
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
				</div>
			</article>
		</form>
	{/if}
</dialog>

<style>
	article {
		overflow: auto;
		padding: 1px 1.5rem 1.5rem;
	}

	@media (min-width: 768px) {
		article {
			padding: 1px 5rem 3rem;
		}
	}

	dialog {
		border: none;
		border-radius: 8px;
		box-shadow: var(--shadow-2xl);
		margin: auto;
		padding: 0;
		width: calc(min(54rem, 100vw));
	}

	dialog::backdrop {
		background: hsla(0, 0%, 50%, 0.3);
	}

	dialog > * {
		min-width: 30rem;
	}

	textarea {
		background-color: white;
		border: none;
		border-radius: 0;
		color: var(--color-gray-900);
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.25;
		min-height: revert;
		overflow: hidden;
		padding: 0;
		resize: none;
	}

	textarea:invalid {
		background-color: var(--color-red-100);
	}

	.button-primary {
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		margin-left: auto;
	}

	.button-disclosure {
		--button-border-color: var(--color-primary-700);
		--button-hover-background: var(--color-primary-700);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		color: var(--color-primary-700);
		display: flex;
		margin: 0.75rem auto 0;
	}

	.button-disclosure:hover {
		color: white;
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.375rem 0 0.75rem;
	}

	.details-title:empty {
		background-color: var(--color-red-100);
	}

	.details-title:empty::before {
		color: var(--color-red-500);
		content: attr(data-placeholder);
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

	.section-label {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 1.5rem 0 1rem;
	}
</style>
