<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import { createDisclosure } from 'svelte-headlessui';
	import { _, date } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import DragHandle from '~icons/knotdots/draghandle';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';
	import clickOutside from '$lib/clickOutside';
	import requestSubmit from '$lib/client/requestSubmit';
	import { type Container, isContainerWithFulfillmentDate, status } from '$lib/models';

	export let container: Container;
	export let editable = false;

	const disclosure = createDisclosure({ expanded: false });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [4, -44] } }]
	};

	const statusOptions = status.options.map((o) => ({ label: $_(o), value: o }));
	$: selectedStatus = statusOptions.find((o) =>
		'status' in container.payload ? o.value == container.payload.status : false
	);
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
			on:input={(e) => e.currentTarget?.closest('form')?.requestSubmit()}
			on:keydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
		></h3>
	{:else}
		<h3 contenteditable="false">{container.payload.title}</h3>
	{/if}
</div>
<div class="cell">
	{#if isContainerWithFulfillmentDate(container)}
		{#if editable}
			<input type="date" bind:value={container.payload.fulfillmentDate} on:change={requestSubmit} />
		{:else if container.payload.fulfillmentDate}
			<time class="value" datetime={container.payload.fulfillmentDate}>
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
