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
	import {
		type Container,
		isContainerWithDescription,
		isContainerWithDuration,
		isContainerWithFulfillmentDate
	} from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';

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
		{#if editable}
			<TopicDropdown bind:value={container.payload.topic} handleChange={requestSubmit} />
		{:else if container.payload.topic.length > 0}
			<ul>
				{#each container.payload.topic as topic}
					<li>
						{$_(topic)}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<div class="cell">
	{#if 'category' in container.payload}
		{#if editable}
			<CategoryDropdown handleChange={requestSubmit} bind:value={container.payload.category} />
		{:else if container.payload.category.length > 0}
			<ul class="category">
				{#each container.payload.category as category}
					<li>
						<img
							src={sdgIcons.get(category)}
							alt={$_(category)}
							title={$_(category)}
							width="30"
							height="30"
						/>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<div class="cell">
	{#if isContainerWithFulfillmentDate(container)}
		{#if editable}
			<input type="date" bind:value={container.payload.fulfillmentDate} onchange={requestSubmit} />
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

<div class="cell cell-nowrap">
	{#if isContainerWithDuration(container)}
		{#if editable}
			<input type="date" bind:value={container.payload.startDate} onchange={requestSubmit} />—
			<input type="date" bind:value={container.payload.endDate} onchange={requestSubmit} />
		{:else}
			{#if container.payload.startDate}
				<time datetime={container.payload.startDate}>
					{$date(new Date(container.payload.startDate), {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric'
					})}
				</time>{/if}{#if container.payload.endDate}–<time datetime={container.payload.endDate}>
					{$date(new Date(container.payload.endDate), {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric'
					})}
				</time>
			{/if}
		{/if}
	{/if}
</div>

<div class="cell">
	{#if 'audience' in container.payload}
		{#if editable}
			<AudienceDropdown bind:value={container.payload.audience} />
		{:else if container.payload.audience.length > 0}
			<ul>
				{#each container.payload.audience as audience}
					<li>{$_(audience)}</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<div class="cell">
	<span>{$_(container.payload.type)}</span>
</div>

<style>
	h3 {
		color: var(--color-gray-900);
		font-size: 1rem;
		font-weight: 500;
		overflow: auto;
	}

	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 3rem;
		width: fit-content;
	}

	.cell {
		overflow: hidden;
		vertical-align: top;
		white-space: nowrap;
	}

	.cell:nth-child(1) {
		color: var(--color-gray-500);
		min-width: calc(20px + 2 * 0.5rem);
	}

	.cell:nth-child(n + 2) {
		max-width: 20rem;
	}

	.category {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		width: 10rem;
	}

	.category > li {
		display: block;
		flex-shrink: 0;
	}
</style>
