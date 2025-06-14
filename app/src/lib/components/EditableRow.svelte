<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import { _, date } from 'svelte-i18n';
	import DragHandle from '~icons/knotdots/draghandle';
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
		isContainerWithFulfillmentDate
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		columns: string[];
		container: Container;
		editable?: boolean;
	}

	let { columns, container = $bindable(), editable = false }: Props = $props();
</script>

{#if columns.includes('action')}
	<div class="cell cell--action">
		{#if editable}
			<span use:dragHandle>
				<DragHandle />
			</span>
		{:else}
			<span></span>
		{/if}
	</div>
{/if}

{#if columns.includes('title')}
	<div class="cell">
		<TitleDropdown {editable} bind:value={container.payload.title} />
	</div>
{/if}

{#if columns.includes('type')}
	<div class="cell">
		<span>{$_(container.payload.type)}</span>
	</div>
{/if}

{#if columns.includes('description')}
	<div class="cell">
		{#if isContainerWithDescription(container)}
			<FormattedTextDropdown {editable} bind:value={container.payload.description} />
		{/if}
	</div>
{/if}

{#if columns.includes('visibility')}
	<div class="cell">
		<VisibilityDropdown {editable} bind:value={container.payload.visibility} />
	</div>
{/if}

{#if columns.includes('status')}
	<div class="cell">
		{#if 'status' in container.payload}
			<StatusDropdown {editable} bind:value={container.payload.status} />
		{:else if 'taskStatus' in container.payload}
			<TaskStatusDropdown {editable} bind:value={container.payload.taskStatus} />
		{:else if 'resolutionStatus' in container.payload}
			<ResolutionStatusDropdown {editable} bind:value={container.payload.resolutionStatus} />
		{/if}
	</div>
{/if}

{#if columns.includes('category')}
	<div class="cell">
		{#if 'category' in container.payload}
			<CategoryDropdown compact {editable} bind:value={container.payload.category} />
		{/if}
	</div>
{/if}

{#if columns.includes('topic')}
	<div class="cell">
		{#if 'topic' in container.payload}
			<TopicDropdown compact {editable} bind:value={container.payload.topic} />
		{/if}
	</div>
{/if}

{#if columns.includes('policyFieldBNK')}
	<div class="cell">
		{#if 'policyFieldBNK' in container.payload}
			<PolicyFieldBNKDropdown compact {editable} bind:value={container.payload.policyFieldBNK} />
		{/if}
	</div>
{/if}

{#if columns.includes('taskCategory')}
	<div class="cell">
		{#if 'taskCategory' in container.payload}
			<TaskCategoryDropdown compact {editable} bind:value={container.payload.taskCategory} />
		{/if}
	</div>
{/if}

{#if columns.includes('audience')}
	<div class="cell">
		{#if 'audience' in container.payload}
			<AudienceDropdown {editable} bind:value={container.payload.audience} />
		{/if}
	</div>
{/if}

{#if columns.includes('fulfillmentDate')}
	<div class="cell">
		{#if isContainerWithFulfillmentDate(container)}
			{#if editable}
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
	<div class="cell">
		{#if isContainerWithDuration(container)}
			{#if editable}
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
	<div class="cell">
		{#if isContainerWithEditorialState(container)}
			<EditorialStateDropdown
				aiSuggestion={'aiSuggestion' in container.payload && container.payload.aiSuggestion}
				{editable}
				bind:value={container.payload.editorialState}
			/>
		{/if}
	</div>
{/if}

{#if columns.includes('organizationalUnit')}
	<div class="cell">
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
		--drop-down-style: table;
		--editor-style: new;
		--form-control-background: white;

		font-size: 0.875rem;
		height: 55px;
		max-width: 20rem;
		vertical-align: middle;
	}

	.cell.cell--action {
		color: var(--color-gray-500);
		min-width: calc(20px + 2 * 0.5rem);
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
