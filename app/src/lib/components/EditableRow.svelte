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
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';
	import PolicyFieldBNKDropdown from '$lib/components/PolicyFieldBNKDropdown.svelte';
	import ResolutionStatusDropdown from '$lib/components/ResolutionStatusDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TaskCategoryDropdown from '$lib/components/TaskCategoryDropdown.svelte';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
	import TitleDropdown from '$lib/components/TitleDropdown.svelte';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';
	import VisibilityDropdown from '$lib/components/VisibilityDropdown.svelte';
	import {
		type Container,
		isContainerWithDescription,
		isContainerWithDuration,
		isContainerWithEditorialState,
		isContainerWithFulfillmentDate,
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

{#if columns.includes('type')}
	<div class="cell" class:cell--locked={editable}>
		<span>{$_(container.payload.type)}</span>
	</div>
{/if}

{#if columns.includes('description')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if isContainerWithDescription(container)}
			<FormattedTextDropdown
				editable={editable && $ability.can('update', container)}
				bind:value={container.payload.description}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('visibility')}
	<div
		class="cell"
		class:cell--locked={editable && $ability.cannot('update', container, 'payload.visibility')}
	>
		<VisibilityDropdown
			editable={editable && $ability.can('update', container, 'payload.visibility')}
			bind:value={container.payload.visibility}
		/>
	</div>
{/if}

{#if columns.includes('status')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if 'status' in container.payload}
			<StatusDropdown
				editable={editable && $ability.can('update', container)}
				offset={[-41, -41]}
				bind:value={container.payload.status}
			/>
		{:else if 'taskStatus' in container.payload}
			<TaskStatusDropdown
				editable={editable && $ability.can('update', container)}
				offset={[-41, -41]}
				bind:value={container.payload.taskStatus}
			/>
		{:else if 'resolutionStatus' in container.payload}
			<ResolutionStatusDropdown
				editable={editable && $ability.can('update', container)}
				offset={[-41, -41]}
				bind:value={container.payload.resolutionStatus}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('category')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if 'category' in container.payload}
			<CategoryDropdown
				compact
				editable={editable && $ability.can('update', container)}
				bind:value={container.payload.category}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('topic')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if 'topic' in container.payload}
			<TopicDropdown
				compact
				editable={editable && $ability.can('update', container)}
				bind:value={container.payload.topic}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('policyFieldBNK')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if 'policyFieldBNK' in container.payload}
			<PolicyFieldBNKDropdown
				compact
				editable={editable && $ability.can('update', container)}
				bind:value={container.payload.policyFieldBNK}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('taskCategory')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if 'taskCategory' in container.payload}
			<TaskCategoryDropdown
				compact
				editable={editable && $ability.can('update', container)}
				bind:value={container.payload.taskCategory}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('audience')}
	<div class="cell" class:cell--locked={editable && $ability.cannot('update', container)}>
		{#if 'audience' in container.payload}
			<AudienceDropdown
				compact
				editable={editable && $ability.can('update', container)}
				bind:value={container.payload.audience}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('fulfillmentDate')}
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
{/if}

{#if columns.includes('duration')}
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
{/if}

{#if columns.includes('editorialState')}
	<div
		class="cell"
		class:cell--locked={editable && $ability.cannot('update', container, 'payload.editorialState')}
	>
		{#if isContainerWithEditorialState(container) && $ability.can('read', container, 'payload.editorialState')}
			<EditorialStateDropdown
				aiSuggestion={'aiSuggestion' in container.payload && container.payload.aiSuggestion}
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('organizationalUnit')}
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
