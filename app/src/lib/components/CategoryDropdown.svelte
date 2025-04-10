<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import { type SustainableDevelopmentGoal, sustainableDevelopmentGoals } from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		handleChange: (event: Event) => void;
		value: SustainableDevelopmentGoal[];
	}

	let { compact = false, editable = false, handleChange, value = $bindable() }: Props = $props();

	const popover = createPopover({ label: $_('category') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [
			{
				name: 'offset',
				options: { offset: [compact ? (editable ? -45 : -13) : 0, compact ? -43 : 4] }
			}
		]
	});
</script>

{#if editable || (value.length > 6 && compact)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" type="button" use:popover.button>
			<span class="value">
				{#each sustainableDevelopmentGoals.options
					.filter((o) => value.includes(o))
					.slice(0, value.length > 6 && compact ? 5 : value.length)
					.map((o) => ({ label: $_(o), value: o })) as selectedOption}
					{@const sdgIcon = sdgIcons.get(selectedOption.value)}
					<img src={sdgIcon} width="30" height="30" alt={selectedOption.label} />
				{:else}
					{$_('empty')}
				{/each}
				{#if value.length > 6 && compact}
					<span class="more-indicator">
						{$_('n_more', { values: { count: value.length - 5 } })}
					</span>
				{/if}
			</span>
			<ChevronDown />
		</button>

		{#if $popover.expanded}
			{#if editable}
				<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<div>
						{#each sustainableDevelopmentGoals.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
							{@const sdgIcon = sdgIcons.get(option.value)}
							<label>
								<input
									type="checkbox"
									value={option.value}
									onchange={handleChange}
									bind:group={value}
								/>
								<img src={sdgIcon} width="30" height="30" alt={option.label} />
								{option.label}
							</label>
						{/each}
					</div>
				</fieldset>
			{:else if value.length > 0}
				<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
					<ul class="value">
						{#each value as category}
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
				</div>
			{/if}
		{/if}
	</div>
{:else}
	<ul class="value">
		{#each value as category}
			<li>
				<img
					src={sdgIcons.get(category)}
					alt={$_(category)}
					title={$_(category)}
					width="30"
					height="30"
				/>
			</li>
		{:else}
			{$_('empty')}
		{/each}
	</ul>
{/if}

<style>
	.dropdown-panel {
		padding: 0.75rem;
	}

	.more-indicator {
		align-items: center;
		background-color: var(--color-gray-700);
		border-radius: 2px;
		color: white;
		display: inline-flex;
		font-size: 0.75rem;
		font-weight: bold;
		height: 30px;
		justify-content: center;
		width: 30px;
	}

	.value {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	@container style(--drop-down-style: table) {
		.dropdown-button,
		.value {
			width: 13.75rem;
		}
	}
</style>
