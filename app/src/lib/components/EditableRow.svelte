<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import { _, date } from 'svelte-i18n';
	import DragHandle from '~icons/knotdots/draghandle';
	import { page } from '$app/state';
	import requestSubmit from '$lib/client/requestSubmit';
	import AudienceDropdown from '$lib/components/AudienceDropdown.svelte';
	import CategoryDropdown from '$lib/components/CategoryDropdown.svelte';
	import OrganizationDropdown from '$lib/components/OrganizationDropdown.svelte';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import TopicDropdown from '$lib/components/TopicDropdown.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import VisibilityDropdown from '$lib/components/VisibilityDropdown.svelte';
	import {
		type Container,
		isContainerWithDescription,
		isContainerWithDuration,
		isContainerWithFulfillmentDate
	} from '$lib/models';

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
	{#if editable}
		<h3
			contenteditable="plaintext-only"
			bind:textContent={container.payload.title}
			oninput={requestSubmit}
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
		></h3>
	{:else}
		<h3 contenteditable="false">{container.payload.title}</h3>
	{/if}
</div>

<div class="cell">
	{#if isContainerWithDescription(container)}
		<Viewer value={container.payload.description} />
	{/if}
</div>

<div class="cell">
	{#if 'status' in container.payload}
		{#if editable}
			<StatusDropdown bind:value={container.payload.status} />
		{:else}
			<span class="badge">{$_(container.payload.status)}</span>
		{/if}
	{/if}
</div>

<div class="cell">
	{#if editable}
		<OrganizationDropdown bind:value={container.organization} />
	{:else}
		<span>
			{page.data.organizations.find(({ guid }) => guid === container.organization)?.payload.name}
		</span>
	{/if}
</div>

<div class="cell">
	{#if editable}
		<OrganizationalUnitDropdown bind:value={container.organizational_unit} />
	{:else}
		<span>
			{page.data.organizationalUnits.find(({ guid }) => guid === container.organizational_unit)
				?.payload.name}
		</span>
	{/if}
</div>

<div class="cell">
	{#if 'topic' in container.payload}
		<TopicDropdown {editable} handleChange={requestSubmit} bind:value={container.payload.topic} />
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
	{#if 'audience' in container.payload}
		{#if editable}
			<AudienceDropdown bind:value={container.payload.audience} />
		{:else if container.payload.audience.length > 0}
			<p class="truncated">
				{container.payload.audience.map((a) => $_(a)).join(', ')}
			</p>
		{/if}
	{/if}
</div>

<div class="cell">
	<span>{$_(container.payload.type)}</span>
</div>

<div class="cell">
	{#if editable}
		<VisibilityDropdown bind:value={container.payload.visibility} />
	{:else}
		<span>{$_(`visibility.${container.payload.visibility}`)}</span>
	{/if}
</div>

<style>
	h3 {
		color: var(--color-gray-900);
		font-size: inherit;
		font-weight: 500;
	}

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
