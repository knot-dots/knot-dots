<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { policyFieldBNK } from '$lib/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		labelledBy?: string;
		value: string[];
	}

	let { compact = false, editable = false, labelledBy, value = $bindable() }: Props = $props();

	const popover = createPopover({ label: $_('policy_field_bnk') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [
			{
				name: 'offset',
				options: { offset: [compact ? (editable ? -41 : -21) : 0, compact ? -41 : 4] }
			}
		]
	});
</script>

{#if editable || (value.length > 1 && compact)}
	<div class="dropdown" use:popperRef>
		<button aria-labelledby={labelledBy} class="dropdown-button" type="button" use:popover.button>
			<span class="value" class:value--compact={compact}>
				{#each policyFieldBNK.options
					.filter((o) => value.includes(o))
					.slice(0, value.length > 1 && compact ? 1 : value.length)
					.map((o) => ({ label: $_(o), value: o })) as selectedOption (selectedOption.value)}
					<span class="badge badge--gray truncated">{selectedOption.label}</span>
				{:else}
					{$_('empty')}
				{/each}
				{#if value.length > 1 && compact}
					<span class="badge badge--gray badge--more">
						{$_('n_more', { values: { count: value.length - 1 } })}
					</span>
				{/if}
			</span>
			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $popover.expanded}
			{#if editable}
				<fieldset
					aria-labelledby={labelledBy}
					class="dropdown-panel"
					use:popperContent={extraOpts}
					use:popover.panel
				>
					<div>
						{#each policyFieldBNK.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
							<label>
								<input type="checkbox" value={option.value} bind:group={value} />
								<span class="badge badge--gray">{option.label}</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{:else}
				<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<ul>
						{#each value as topic (topic)}
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
	<div class="value class:value--compact={compact}">
		{#each policyFieldBNK.options
			.filter((o) => value.includes(o))
			.slice(0, compact ? 1 : value.length)
			.map((o) => ({ label: $_(o), value: o })) as selectedOption (selectedOption.value)}
			<span class="badge badge--gray truncated">{selectedOption.label}</span>
		{:else}
			{$_('empty')}
		{/each}
	</div>
{/if}

<style>
	.dropdown {
		--dropdown-button-align-items: start;
	}

	li {
		display: flex;
		padding: 0.5rem 0.75rem;
	}

	.badge {
		display: inline;
	}

	.value {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-width: 0;
	}

	.value.value--compact {
		flex-wrap: nowrap;
	}
</style>
