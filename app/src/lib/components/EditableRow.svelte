<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import { _, date } from 'svelte-i18n';
	import DragHandle from '~icons/knotdots/draghandle';
	import Overlay from '~icons/knotdots/overlay';
	import { page } from '$app/state';
	import AudienceDropdown from '$lib/components/AudienceDropdown.svelte';
	import CategoryDropdown from '$lib/components/CategoryDropdown.svelte';
	import EditorialStateDropdown from '$lib/components/EditorialStateDropdown.svelte';
	import FormattedTextDropdown from '$lib/components/FormattedTextDropdown.svelte';
	import GoalStatusDropdown from '$lib/components/GoalStatusDropdown.svelte';
	import GoalTypeDropdown from '$lib/components/GoalTypeDropdown.svelte';
	import EditableHierarchyLevel from '$lib/components/EditableHierarchyLevel.svelte';
	import IndicatorCategoryDropdown from '$lib/components/IndicatorCategoryDropdown.svelte';
	import IndicatorTypeDropdown from '$lib/components/IndicatorTypeDropdown.svelte';
	import IndicatorUnitDropdown from '$lib/components/IndicatorUnitDropdown.svelte';
	import MeasureTypeDropdown from '$lib/components/MeasureTypeDropdown.svelte';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';
	import ParentDropdown from '$lib/components/ParentDropdown.svelte';
	import PolicyFieldBNKDropdown from '$lib/components/PolicyFieldBNKDropdown.svelte';
	import ProgramStatusDropdown from '$lib/components/ProgramStatusDropdown.svelte';
	import ProgramTypeDropdown from '$lib/components/ProgramTypeDropdown.svelte';
	import RuleStatusDropdown from '$lib/components/RuleStatusDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TaskCategoryDropdown from '$lib/components/TaskCategoryDropdown.svelte';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
	import TitleDropdown from '$lib/components/TitleDropdown.svelte';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';
	import VisibilityDropdown from '$lib/components/VisibilityDropdown.svelte';
	import {
		type Container,
		type GoalStatus,
		type ProgramStatus,
		type ResourceCategory,
		type ResourceUnit,
		type RuleStatus,
		type Status,
		type TaskCategory,
		type TaskStatus,
		isContainerWithDescription,
		isContainerWithDuration,
		isContainerWithEditorialState,
		isContainerWithFulfillmentDate,
		isGoalContainer,
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isProgramContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		columns: string[];
		container: Container;
		dragEnabled?: boolean;
		editable?: boolean;
	}

	let { columns, container = $bindable(), dragEnabled = false, editable = false }: Props = $props();
</script>

<div class="cell cell--action">
	{#if editable && dragEnabled}
		<span class="drag-handle" use:dragHandle>
			<DragHandle />
		</span>
	{/if}
	<a href={overlayURL(page.url, overlayKey.enum.view, container.guid)}>
		<Overlay />
	</a>
</div>

{#if columns.includes('title')}
	<div class="cell">
		<TitleDropdown
			editable={editable && $ability.can('update', container)}
			bind:value={container.payload.title}
		/>
	</div>
{/if}

{#each columns as col (col)}
	{#if col === 'type'}
		<div class="cell" class:cell--locked={editable}>
			<span>{$_(container.payload.type) as string}</span>
		</div>
	{:else if col === 'description'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isContainerWithDescription(container)}
				<FormattedTextDropdown
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.description}
				/>
			{/if}
		</div>
	{:else if col === 'visibility'}
		<div
			class="cell"
			class:cell--locked={editable && $ability.cannot('update', container, 'payload.visibility')}
		>
			<VisibilityDropdown
				editable={editable && $ability.can('update', container, 'payload.visibility')}
				bind:value={container.payload.visibility}
			/>
		</div>
	{:else if col === 'status'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'status' in container.payload}
				<StatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[-41, -41]}
					bind:value={container.payload.status as Status}
				/>
			{:else if 'taskStatus' in container.payload}
				<TaskStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[-41, -41]}
					bind:value={container.payload.taskStatus as TaskStatus}
				/>
			{:else if 'ruleStatus' in container.payload}
				<RuleStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[-41, -41]}
					bind:value={container.payload.ruleStatus as RuleStatus}
				/>
			{:else if 'goalStatus' in container.payload}
				<GoalStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[-41, -41]}
					bind:value={container.payload.goalStatus as GoalStatus}
				/>
			{:else if 'programStatus' in container.payload}
				<ProgramStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[-41, -41]}
					bind:value={container.payload.programStatus as ProgramStatus}
				/>
			{/if}
		</div>
	{:else if col === 'category'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'category' in container.payload}
				<CategoryDropdown
					compact
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.category}
				/>
			{/if}
		</div>
	{:else if col === 'indicatorType'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'indicatorType' in container.payload}
				<IndicatorTypeDropdown
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.indicatorType}
				/>
			{/if}
		</div>
	{:else if col === 'unit'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isIndicatorContainer(container) || isIndicatorTemplateContainer(container)}
				<IndicatorUnitDropdown
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.unit}
				/>
			{/if}
		</div>
	{:else if col === 'indicatorCategory'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'indicatorCategory' in container.payload}
				<IndicatorCategoryDropdown
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.indicatorCategory}
				/>
			{/if}
		</div>
	{:else if col === 'topic'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'topic' in container.payload}
				<TopicDropdown
					compact
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.topic}
				/>
			{/if}
		</div>
	{:else if col === 'policyFieldBNK'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'policyFieldBNK' in container.payload}
				<PolicyFieldBNKDropdown
					compact
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.policyFieldBNK}
				/>
			{/if}
		</div>
	{:else if col === 'taskCategory'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'taskCategory' in container.payload}
				<TaskCategoryDropdown
					compact
					editable={editable && $ability.can('update', container)}
							bind:value={container.payload.taskCategory as TaskCategory}
				/>
			{/if}
		</div>
	{:else if col === 'audience'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'audience' in container.payload}
				<AudienceDropdown
					compact
					editable={editable && $ability.can('update', container)}
					bind:value={container.payload.audience}
				/>
			{/if}
		</div>
	{:else if col === 'fulfillmentDate'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isContainerWithFulfillmentDate(container)}
				{#if editable && $ability.can('update', container)}
					<input type="date" bind:value={container.payload.fulfillmentDate} />
				{:else if container.payload.fulfillmentDate}
					<time datetime={container.payload.fulfillmentDate}>
						{$date(new Date(container.payload.fulfillmentDate), {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric'
						})}
					</time>
				{/if}
			{/if}
		</div>
	{:else if col === 'duration'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isContainerWithDuration(container)}
				{#if editable && $ability.can('update', container)}
					<fieldset>
						<input type="date" bind:value={container.payload.startDate} />–<input
							type="date"
							bind:value={container.payload.endDate}
						/>
					</fieldset>
				{:else}
					<span>
						{#if container.payload.startDate}
							<time datetime={container.payload.startDate}>
								{$date(new Date(container.payload.startDate), {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric'
								})}
							</time>
						{/if}
						{#if container.payload.endDate}
							–
							<time datetime={container.payload.endDate}>
								{$date(new Date(container.payload.endDate), {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric'
								})}
							</time>
						{/if}
					</span>
				{/if}
			{/if}
		</div>
	{:else if col === 'editorialState'}
		<div
			class="cell"
			class:cell--locked={editable &&
				$ability.cannot('update', container, 'payload.editorialState')}
		>
			{#if isContainerWithEditorialState(container) && $ability.can('read', container, 'payload.editorialState')}
				<EditorialStateDropdown
					aiSuggestion={'aiSuggestion' in container.payload && container.payload.aiSuggestion}
					editable={editable && $ability.can('update', container, 'payload.editorialState')}
					bind:value={container.payload.editorialState}
				/>
			{/if}
		</div>
	{:else if col === 'organizationalUnit'}
		<div
			class="cell"
			class:cell--locked={editable && $ability.cannot('update', container, 'organizational_unit')}
		>
			<OrganizationalUnitDropdown
				editable={editable && $ability.can('update', container, 'organizational_unit')}
				organization={container.organization}
				bind:value={container.organizational_unit}
			/>
		</div>
	{/if}
{/each}

{#if columns.includes('resourceCategory')}
	<div class="cell cell--locked">
			{#if 'resourceCategory' in container.payload}
					<span>{$_(container.payload.resourceCategory as ResourceCategory) as string}</span>
		{/if}
	</div>
{/if}

{#if columns.includes('resourceUnit')}
	<div class="cell cell--locked">
			{#if 'resourceUnit' in container.payload}
					<span>{$_(container.payload.resourceUnit as ResourceUnit) as string}</span>
		{/if}
	</div>
{/if}

{#if columns.includes('hierarchyLevel')}
	<div
		class="cell"
		class:cell--locked={editable && $ability.cannot('update', container, 'payload.hierarchyLevel')}
	>
		{#if isGoalContainer(container)}
			<EditableHierarchyLevel
				editable={editable && $ability.can('update', container, 'payload.hierarchyLevel')}
				showLabel={false}
				bind:value={container.payload.hierarchyLevel}
			/>
		{/if}
	</div>
{/if}
{#if columns.includes('objectType')}
	{#if isGoalContainer(container)}
		<div
			class="cell"
			class:cell--locked={editable && $ability.cannot('update', container, 'payload.goalType')}
		>
			<GoalTypeDropdown
				editable={editable && $ability.can('update', container, 'payload.goalType')}
				bind:value={container.payload.goalType}
			/>
		</div>
	{:else if isProgramContainer(container)}
		<div
			class="cell"
			class:cell--locked={editable && $ability.cannot('update', container, 'payload.programType')}
		>
			<ProgramTypeDropdown
				editable={editable && $ability.can('update', container, 'payload.programType')}
				bind:value={container.payload.programType}
			/>
		</div>
	{:else if isMeasureContainer(container)}
		<div
			class="cell"
			class:cell--locked={editable && $ability.cannot('update', container, 'payload.measureType')}
		>
			<MeasureTypeDropdown
				editable={editable && $ability.can('update', container, 'payload.measureType')}
				bind:value={container.payload.measureType}
			/>
		</div>
	{/if}
{/if}

{#if columns.includes('parentObject')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		<ParentDropdown
			offset={[0, -39]}
			editable={editable && $ability.can('update', container)}
			{container}
		/>
	</div>
{/if}

<style>
	fieldset {
		border: none;
		padding: 0;
	}

	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		padding: 0;
		width: fit-content;
	}

	.cell {
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-gray-700);
		--dropdown-button-active-background: var(--dropdown-button-default-background);
		--dropdown-button-hover-background: var(--dropdown-button-default-background);
		--dropdown-button-border-width: 0;
		--dropdown-button-padding: 0;
		--dropdown-button-chevron-display: none;
		--form-control-background: white;

		font-size: 0.875rem;
		height: 55px;
		max-width: 20rem;
	}

	.cell.cell--action {
		color: var(--color-gray-500);
		line-height: 1;
		white-space: nowrap;
	}

	.cell.cell--action > * {
		display: inline-block;
	}

	.cell.cell--action :global(svg) {
		max-width: none;
	}

	.cell.cell--locked {
		background: repeating-linear-gradient(45deg, #fff5f5, #fff5f5 2px, #ffebeb 2px, #ffebeb 4px);
		color: #666;
		cursor: not-allowed;
	}

	:global(.row:hover input) {
		background-color: var(--color-gray-050);
	}

	:global(.row:hover .cell:hover input) {
		background-color: var(--color-gray-100);
	}

	.cell > :global(input[type='number']) {
		padding: 0;
	}

	.cell > :global(span),
	.cell > fieldset {
		white-space: nowrap;
	}

	.drag-handle {
		display: none !important;
	}

	@container (min-inline-size: 90rem) {
		.drag-handle {
			display: inline-block !important;
		}
	}
</style>
