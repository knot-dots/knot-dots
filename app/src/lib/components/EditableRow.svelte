<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import { _, date } from 'svelte-i18n';
	import DragHandle from '~icons/knotdots/draghandle';
	import Overlay from '~icons/knotdots/overlay';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import CustomCategoryDropdown from '$lib/components/CustomCategoryDropdown.svelte';
	import EditableGoalHierarchyLevel from '$lib/components/EditableGoalHierarchyLevel.svelte';
	import EditorialStateDropdown from '$lib/components/EditorialStateDropdown.svelte';
	import FormattedTextDropdown from '$lib/components/FormattedTextDropdown.svelte';
	import GoalStatusDropdown from '$lib/components/GoalStatusDropdown.svelte';
	import GoalTypeDropdown from '$lib/components/GoalTypeDropdown.svelte';
	import IndicatorCategoryDropdown from '$lib/components/IndicatorCategoryDropdown.svelte';
	import IndicatorTypeDropdown from '$lib/components/IndicatorTypeDropdown.svelte';
	import IndicatorUnitDropdown from '$lib/components/IndicatorUnitDropdown.svelte';
	import MeasureTypeDropdown from '$lib/components/MeasureTypeDropdown.svelte';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';
	import ParentDropdown from '$lib/components/ParentDropdown.svelte';
	import ProgramStatusDropdown from '$lib/components/ProgramStatusDropdown.svelte';
	import ProgramTypeDropdown from '$lib/components/ProgramTypeDropdown.svelte';
	import RuleStatusDropdown from '$lib/components/RuleStatusDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TaskCategoryDropdown from '$lib/components/TaskCategoryDropdown.svelte';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
	import TitleDropdown from '$lib/components/TitleDropdown.svelte';
	import VisibilityDropdown from '$lib/components/VisibilityDropdown.svelte';
	import {
		type ActualDataContainer,
		type AnyContainer,
		isActualDataContainer,
		isContainerWithDescription,
		isContainerWithDuration,
		isContainerWithEditorialState,
		isContainerWithFulfillmentDate,
		isGoalContainer,
		isIndicatorTemplateContainer,
		isKnowledgeContainer,
		isMeasureContainer,
		isProgramContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		actualDataContainers?: ActualDataContainer[];
		columns: string[];
		container: AnyContainer;
		dragEnabled?: boolean;
		editable?: boolean;
	}

	let {
		actualDataContainers = [],
		columns,
		container = $bindable(),
		dragEnabled = false,
		editable = false
	}: Props = $props();

	function saveActualData(actualData: ActualDataContainer | undefined, year: number) {
		return async (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => {
			const val = event.currentTarget.value;
			if (!actualData) return;
			const existingIdx = actualData.payload.values.findIndex(([y]) => y === year);
			if (val === '' || val === null) {
				if (existingIdx >= 0) {
					actualData.payload.values.splice(existingIdx, 1);
				}
			} else {
				const num = parseFloat(val);
				if (!isNaN(num)) {
					if (existingIdx >= 0) {
						actualData.payload.values[existingIdx] = [year, num];
					} else {
						actualData.payload.values.push([year, num]);
						actualData.payload.values.sort(
							(a: [number, number], b: [number, number]) => a[0] - b[0]
						);
					}
				}
			}
			const response = await saveContainer(actualData);
			if (response.ok) {
				const updatedContainer = await response.json();
				actualData.revision = updatedContainer.revision;
			} else {
				const error = await response.json();
				alert(error.message);
			}
		};
	}

	const customCategoryKeys = $derived(page.data.categoryContext.keys);
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
			offset={[40, -39]}
			bind:value={
				() => ('title' in container.payload ? container.payload.title : container.payload.name),
				(v) =>
					'title' in container.payload
						? (container.payload.title = v)
						: (container.payload.name = v)
			}
		/>
	</div>
{/if}

{#each columns as col (col)}
	{#if col === 'type'}
		<div class="cell" class:cell--locked={editable}>
			<span>{$_(container.payload.type)}</span>
		</div>
	{:else if col === 'description'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isContainerWithDescription(container)}
				<FormattedTextDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -39]}
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
				offset={[40, -39]}
				bind:value={container.payload.visibility}
			/>
		</div>
	{:else if col === 'status'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'status' in container.payload}
				<StatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -41]}
					bind:value={container.payload.status}
				/>
			{:else if 'taskStatus' in container.payload}
				<TaskStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -41]}
					bind:value={container.payload.taskStatus}
				/>
			{:else if 'ruleStatus' in container.payload}
				<RuleStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -41]}
					bind:value={container.payload.ruleStatus}
				/>
			{:else if 'goalStatus' in container.payload}
				<GoalStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -41]}
					bind:value={container.payload.goalStatus}
				/>
			{:else if 'programStatus' in container.payload}
				<ProgramStatusDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -41]}
					bind:value={container.payload.programStatus}
				/>
			{/if}
		</div>
	{:else if col === 'indicatorType'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'indicatorType' in container.payload}
				<IndicatorTypeDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -39]}
					bind:value={container.payload.indicatorType}
				/>
			{/if}
		</div>
	{:else if col === 'unit'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isIndicatorTemplateContainer(container)}
				<IndicatorUnitDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -39]}
					bind:value={container.payload.unit}
				/>
			{/if}
		</div>
	{:else if col === 'indicatorCategory'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'indicatorCategory' in container.payload}
				<IndicatorCategoryDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -39]}
					bind:value={container.payload.indicatorCategory}
				/>
			{/if}
		</div>
	{:else if col === 'taskCategory'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'taskCategory' in container.payload}
				<TaskCategoryDropdown
					editable={editable && $ability.can('update', container)}
					offset={[40, -39]}
					bind:value={container.payload.taskCategory}
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
					offset={[40, -39]}
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
				offset={[40, -39]}
				organization={container.organization}
				bind:value={container.organizational_unit}
			/>
		</div>
	{:else if col === 'aiSuggestionPageReference'}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if isKnowledgeContainer(container) && container.payload.aiSuggestionPageReference}
				<span>
					{container.payload.aiSuggestionPageReference}
				</span>
			{/if}
		</div>
	{:else if col.startsWith('year:')}
		{@const year = parseInt(col.split(':')[1], 10)}
		{@const actualData = actualDataContainers.find(
			(c) => isActualDataContainer(c) && c.payload.indicator === container.guid
		)}
		{@const values = actualData ? actualData.payload.values : []}
		{@const idx = values.findIndex(([y]) => y === year)}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if editable && $ability.can('update', container)}
				<input
					type="text"
					inputmode="numeric"
					value={idx >= 0 ? values[idx][1] : ''}
					onchange={saveActualData(actualData, year)}
				/>
			{:else if idx >= 0}
				<span>{values[idx][1]}</span>
			{/if}
		</div>
	{:else if customCategoryKeys.includes(col)}
		<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
			{#if 'category' in container.payload}
				<CustomCategoryDropdown
					compact
					editable={editable && $ability.can('update', container)}
					offset={[40, -41]}
					options={page.data.categoryContext.options[col] ?? []}
					bind:value={container.payload.category[col]}
				/>
			{/if}
		</div>
	{/if}
{/each}

{#if columns.includes('resourceCategory')}
	<div class="cell cell--locked">
		{#if 'resourceCategory' in container.payload}
			<span>{$_(container.payload.resourceCategory)}</span>
		{/if}
	</div>
{/if}

{#if columns.includes('resourceUnit')}
	<div class="cell cell--locked">
		{#if 'resourceUnit' in container.payload}
			<span>{$_(container.payload.resourceUnit)}</span>
		{/if}
	</div>
{/if}

{#if columns.includes('hierarchyLevel')}
	<div
		class="cell"
		class:cell--locked={editable && $ability.cannot('update', container, 'payload.hierarchyLevel')}
	>
		{#if isGoalContainer(container)}
			<EditableGoalHierarchyLevel
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
				offset={[40, -39]}
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
				offset={[40, -39]}
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
				offset={[40, -39]}
				bind:value={container.payload.measureType}
			/>
		</div>
	{:else}
		<div class="cell"></div>
	{/if}
{/if}

{#if columns.includes('parentObject')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		<ParentDropdown
			offset={[40, -39]}
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

	input[type='text'] {
		border: none;
		field-sizing: content;
		line-height: 1.5;
		min-width: 2rem;
		padding: 0;
		text-align: right;
	}

	.cell {
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-gray-700);
		--dropdown-button-active-background: var(--dropdown-button-default-background);
		--dropdown-button-expanded-background: var(--color-primary-100);
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

	.cell:has(input:focus-within),
	.cell:has(:global([aria-expanded='true'])) {
		background-color: var(--color-primary-100);
	}

	:global(.row:hover input) {
		background-color: var(--color-gray-050);
	}

	:global(.row:hover .cell:hover input) {
		background-color: var(--color-gray-100);
	}

	.cell > :global(span),
	.cell > fieldset {
		white-space: nowrap;
	}
</style>
