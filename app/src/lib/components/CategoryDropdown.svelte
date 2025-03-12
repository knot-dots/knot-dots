<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import { type SustainableDevelopmentGoal, sustainableDevelopmentGoals } from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';

	interface Props {
		editable?: boolean;
		handleChange: (event: Event) => void;
		value: SustainableDevelopmentGoal[];
	}

	let { editable = false, handleChange, value = $bindable() }: Props = $props();

	const popover = createPopover({ label: $_('category') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset: [editable ? -45 : -13, -43] } }]
	});
</script>

{#if editable || value.length > 6}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" type="button" use:popover.button>
			{#if value.length > 0}
				{#each sustainableDevelopmentGoals.options
					.filter((o) => value.includes(o))
					.slice(0, value.length > 6 ? 5 : value.length)
					.map((o) => ({ label: $_(o), value: o })) as selectedOption}
					{@const sdgIcon = sdgIcons.get(selectedOption.value)}
					<img src={sdgIcon} width="30" height="30" alt={selectedOption.label} />
				{:else}
					&nbsp;
				{/each}
			{/if}
			{#if value.length > 6}
				<span class="more-indicator">{$_('n_more', { values: { count: value.length - 5 } })}</span>
			{/if}
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
					<ul>
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
{:else if value.length > 0}
	<ul>
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
{/if}

<style>
	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 13.75rem;
	}

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
</style>
