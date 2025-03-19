<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import { topics } from '$lib/models';

	interface Props {
		editable?: boolean;
		handleChange: (event: Event) => void;
		value: string[];
	}

	let { editable = false, handleChange, value = $bindable() }: Props = $props();

	const popover = createPopover({ label: $_('topic') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset: [editable ? -41 : -21, -41] } }]
	});
</script>

{#if editable || value.length > 1}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" type="button" use:popover.button>
			{#if value.length > 0}
				{#each topics.options
					.filter((o) => value.includes(o))
					.slice(0, 1)
					.map((o) => ({ label: $_(o), value: o })) as selectedOption}
					<span class="badge badge--gray">{selectedOption.label}</span>
				{:else}
					&nbsp;
				{/each}
				{#if value.length > 1}
					<span class="badge badge--gray badge--more">
						{$_('n_more', { values: { count: value.length - 1 } })}
					</span>
				{/if}
			{/if}
			<ChevronDown />
		</button>

		{#if $popover.expanded}
			{#if editable}
				<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<div>
						{#each topics.options.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
							<label>
								<input
									type="checkbox"
									value={option.value}
									onchange={handleChange}
									bind:group={value}
								/>
								<span class="badge badge--gray">{option.label}</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{:else}
				<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<ul>
						{#each value as topic}
							<li>
								<span class="badge badge--gray">{$_(topic)}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</div>
{:else}
	{#each topics.options
		.filter((o) => value.includes(o))
		.slice(0, 1)
		.map((o) => ({ label: $_(o), value: o })) as selectedOption}
		<span class="badge badge--gray">{selectedOption.label}</span>
	{/each}
{/if}

<style>
	li {
		display: flex;
		padding: 0.5rem 0.75rem;
	}

	.badge {
		float: left;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@container style(--drop-down-style: table) {
		button > :global(svg) {
			display: none;
		}
	}
</style>
