<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import { _, date } from 'svelte-i18n';
	import DragHandle from '~icons/knotdots/draghandle';
	import requestSubmit from '$lib/client/requestSubmit';
	import AudienceDropdown from '$lib/components/AudienceDropdown.svelte';
	import CategoryDropdown from '$lib/components/CategoryDropdown.svelte';
	import FormattedTextDropdown from '$lib/components/FormattedTextDropdown.svelte';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TitleDropdown from '$lib/components/TitleDropdown.svelte';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';
	import VisibilityDropdown from '$lib/components/VisibilityDropdown.svelte';
	import {
		type Container,
		isContainerWithDescription,
		isContainerWithDuration,
		isContainerWithFulfillmentDate
	} from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: Container;
	export let editable: boolean;
</script>

<div class="cell">
	{#if editable}
		<span use:dragHandle>
			<DragHandle />
		</span>
	{:else}
		<span></span>
	{/if}
</div>

<div class="cell">
	<TitleDropdown {editable} bind:value={container.payload.title} />
</div>

<div class="cell">
	<span>{$_(container.payload.type)}</span>
</div>

<div class="cell">
	{#if isContainerWithDescription(container) && container.payload.description}
		<FormattedTextDropdown {editable} bind:value={container.payload.description} />
	{/if}
</div>

<div class="cell">
	<VisibilityDropdown {editable} bind:value={container.payload.visibility} />
</div>

<div class="cell">
	{#if 'status' in container.payload}
		<StatusDropdown {editable} bind:value={container.payload.status} />
	{/if}
</div>

<div class="cell">
	{#if 'category' in container.payload}
		<CategoryDropdown
			{editable}
			handleChange={requestSubmit}
			bind:value={container.payload.category}
		/>
	{/if}
</div>

<div class="cell">
	{#if 'topic' in container.payload}
		<TopicDropdown {editable} handleChange={requestSubmit} bind:value={container.payload.topic} />
	{/if}
</div>

<div class="cell">
	{#if 'audience' in container.payload}
		<AudienceDropdown {editable} bind:value={container.payload.audience} />
	{/if}
</div>

<div class="cell">
	{#if isContainerWithFulfillmentDate(container)}
		{#if editable}
			<input type="date" onchange={requestSubmit} bind:value={container.payload.fulfillmentDate} />
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

<div class="cell">
	{#if isContainerWithDuration(container)}
		{#if editable}
			<fieldset>
				<input
					type="date"
					onchange={requestSubmit}
					bind:value={container.payload.startDate}
				/>–<input type="date" onchange={requestSubmit} bind:value={container.payload.endDate} />
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

<div class="cell">
	<OrganizationalUnitDropdown
		editable={editable && $ability.can('update', container, 'organizational_unit')}
		bind:value={container.organizational_unit}
	/>
</div>

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
		vertical-align: middle;
	}

	.cell:hover,
	:global(.row:hover .cell:hover input) {
		background-color: var(--color-gray-100);
	}

	.cell:nth-child(1) {
		color: var(--color-gray-500);
		min-width: calc(20px + 2 * 0.5rem);
	}

	.cell:nth-child(n + 2) {
		max-width: 20rem;
	}

	.cell > :global(span),
	.cell > fieldset {
		white-space: nowrap;
	}
</style>
