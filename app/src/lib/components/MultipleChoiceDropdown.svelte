<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		compact?: boolean;
		offset?: [number, number];
		options: Array<{ label: string; value: string; icon?: string }>;
		value: string[];
	}

	let { compact = false, offset = [0, 4], options, value = $bindable() }: Props = $props();

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset } }]
	};

	function iconURL(origin?: string) {
		if (!origin) return undefined;
		try {
			return transformFileURL(origin);
		} catch (error) {
			console.warn('Failed to transform icon URL', error);
			return origin;
		}
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span class="selected" class:truncated={compact}>
			{#each options.filter( (o) => value.includes(o.value) ) as selectedOption (selectedOption.value)}
				{@const iconSrc = iconURL(selectedOption.icon)}
				<span class="value" class:value--compact={compact}>
					{#if iconSrc}
						<img alt="" class="selected-icon" src={iconSrc} />
					{/if}
					{selectedOption.label}
				</span>
			{:else}
				{$_('empty')}
			{/each}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options as option (option.value)}
					{@const iconSrc = iconURL(option.icon)}
					<label>
						<input type="checkbox" value={option.value} bind:group={value} />
						<span class="option-label">
							{#if iconSrc}
								<img alt="" class="option-icon" src={iconSrc} />
							{/if}
							{option.label}
						</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-align-items: start;
	}

	.selected {
		display: block;
	}

	.value {
		align-items: center;
		display: flex;
		gap: 0.35rem;
		padding: 0;
		text-align: left;
	}

	.value + .value {
		margin-top: 0.35rem;
	}

	.value.value--compact {
		display: inline;
	}

	.value.value--compact:not(:last-child)::after {
		content: ', ';
	}

	.selected-icon {
		height: 1.25rem;
		margin-right: 0.35rem;
		object-fit: contain;
		width: 1.25rem;
	}

	.option-label {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
	}

	.option-icon {
		height: 1.25rem;
		width: 1.25rem;
		object-fit: contain;
	}
</style>
