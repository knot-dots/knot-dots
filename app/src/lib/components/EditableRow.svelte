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
<div class="cell">
	{#if 'status' in container.payload}
		{#if editable}
			<div
				class="dropdown-reference"
				use:popperRef
				use:clickOutside
				on:outsideclick={() => disclosure.close()}
			>
				<button class="dropdown-button" type="button" use:disclosure.button>
					{#if selectedStatus}{selectedStatus.label}{:else}&nbsp;{/if}<ChevronUpDown />
				</button>
				{#if $disclosure.expanded}
					<fieldset class="dropdown-panel" use:disclosure.panel use:popperContent={extraOpts}>
						{#each statusOptions as option (option.value)}
							<label>
								<input
									type="radio"
									value={option.value}
									bind:group={container.payload.status}
									on:change={requestSubmit}
								/>
								{option.label}
							</label>
						{/each}
					</fieldset>
				{/if}
			</div>
		{:else if selectedStatus}
			<span>{selectedStatus.label}</span>
		{/if}
	{/if}
</div>
<div class="cell">
	<span>{$_(container.payload.type)}</span>
</div>

<style>
	h3 {
		font-size: 1rem;
		font-weight: 600;
		overflow: auto;
	}

	input[type='date'] {
		border: none;
		border-radius: 0;
		display: flex;
		line-height: 1.5;
		max-height: 3rem;
	}

	.cell {
		padding: 0;
		white-space: nowrap;
	}

	.cell:nth-child(n + 2) {
		border: solid 1px var(--color-gray-200);
		max-width: 20rem;
	}

	.cell > * {
		display: block;
		padding: 0.75rem 1rem;
	}

	.cell:nth-child(1) > span {
		color: var(--color-gray-500);
		width: calc(1.25rem + 2rem);
	}

	.cell > :is(input[type='date'], [contenteditable='plaintext-only'], .dropdown-reference) {
		background-color: var(--color-gray-050);
	}

	.dropdown-button {
		background-color: transparent;
		border: none;
		border-radius: 0;
		padding: 0;
	}

	.dropdown-panel {
		width: auto;
	}
</style>
