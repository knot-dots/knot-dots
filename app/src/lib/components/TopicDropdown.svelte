<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import { topics } from '$lib/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		value: string[];
	}

	let { compact = false, editable = false, value = $bindable() }: Props = $props();

	const popover = createPopover({ label: $_('topic') });

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
		<button class="dropdown-button" type="button" use:popover.button>
			<span class="value">
				{#each topics.options
					.filter((o) => value.includes(o))
					.slice(0, value.length > 1 && compact ? 1 : value.length)
					.map((o) => ({ label: $_(o), value: o })) as selectedOption}
					<span class="badge badge--gray">{selectedOption.label}</span>
				{:else}
					{$_('empty')}
				{/each}
				{#if value.length > 1 && compact}
					<span class="badge badge--gray badge--more">
						{$_('n_more', { values: { count: value.length - 1 } })}
					</span>
				{/if}
			</span>
			<ChevronDown />
		</button>

		{#if $popover.expanded}
			{#if editable}
				<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<div>
						{#each topics.options.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
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
	<div class="value">
		{#each topics.options
			.filter((o) => value.includes(o))
			.slice(0, compact ? 1 : value.length)
			.map((o) => ({ label: $_(o), value: o })) as selectedOption}
			<span class="badge badge--gray">{selectedOption.label}</span>
		{:else}
			{$_('empty')}
		{/each}
	</div>
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

	.value {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	@container style(--drop-down-style: table) {
		.value {
			flex-wrap: nowrap;
		}
	}
</style>
