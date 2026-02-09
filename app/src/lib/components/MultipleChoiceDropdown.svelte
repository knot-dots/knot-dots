<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import ChevronRight from '~icons/heroicons/chevron-right-16-solid';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		compact?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{
			label: string;
			value: string;
			icon?: string;
			subterms?: Array<{ label: string; value: string; icon?: string }>;
		}>;
		value: string[];
	}

	let {
		compact = false,
		labelledBy,
		offset = [0, 4],
		options,
		value = $bindable()
	}: Props = $props();

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset } }]
	};

	let panelEl = $state<HTMLElement | null>(null);
	let hoveredSubterms = $state<
		Array<{ label: string; value: string; icon?: string }> | undefined
	>();
	let flyoutPlacement = $state<'left' | 'right'>('right');
	let flyoutTop = $state(0);
	let hideFlyoutTimeout: number | undefined;

	function showSubtermsAt(
		anchor: HTMLElement,
		option: { subterms?: { label: string; value: string; icon?: string }[] }
	) {
		if (!option.subterms?.length) {
			hoveredSubterms = undefined;
			return;
		}

		hoveredSubterms = option.subterms;

		const optionRect = anchor.getBoundingClientRect();
		const panelRect = panelEl?.getBoundingClientRect();
		if (panelRect) {
			flyoutTop = optionRect.top - panelRect.top;
			const spaceRight = window.innerWidth - panelRect.right;
			flyoutPlacement = spaceRight < 260 ? 'left' : 'right';
		}
	}

	function handleOptionEnter(
		event: MouseEvent,
		option: { subterms?: { label: string; value: string; icon?: string }[] }
	) {
		window.clearTimeout(hideFlyoutTimeout);
		showSubtermsAt(event.currentTarget as HTMLElement, option);
	}

	function handleOptionLeave() {
		hideFlyoutTimeout = window.setTimeout(() => {
			hoveredSubterms = undefined;
		}, 120);
	}

	function handleFlyoutEnter() {
		window.clearTimeout(hideFlyoutTimeout);
	}

	function handleChevronClick(
		event: MouseEvent,
		option: { subterms?: { label: string; value: string; icon?: string }[] }
	) {
		event.preventDefault();
		event.stopPropagation();
		window.clearTimeout(hideFlyoutTimeout);
		const anchor = (event.currentTarget as HTMLElement).closest('.option') as HTMLElement | null;
		if (!anchor) return;
		showSubtermsAt(anchor, option);
	}

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
	<button aria-labelledby={labelledBy} class="dropdown-button" type="button" use:popover.button>
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
		<fieldset
			aria-labelledby={labelledBy}
			class="dropdown-panel"
			use:popperContent={extraOpts}
			use:popover.panel
			bind:this={panelEl}
		>
			<div>
				{#each options as option (option.value)}
					{@const iconSrc = iconURL(option.icon)}
					<div
						class="option"
						role="presentation"
						onmouseenter={(event) => handleOptionEnter(event, option)}
						onmouseleave={handleOptionLeave}
					>
						<label>
							<input type="checkbox" value={option.value} bind:group={value} />
							<span class="option-label">
								{#if iconSrc}
									<img alt="" class="option-icon" src={iconSrc} />
								{/if}
								{option.label}
							</span>
						</label>
						{#if option.subterms?.length}
							<button
								type="button"
								class="subterm-button"
								onclick={(event) => handleChevronClick(event, option)}
								onkeydown={(event) =>
									event.key === 'Enter' || event.key === ' '
										? (event.preventDefault(),
											handleChevronClick(event as unknown as MouseEvent, option))
										: undefined}
								aria-label={$_('filter.show_subterms')}
							>
								<ChevronRight class="subterm-indicator" aria-hidden="true" />
							</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if hoveredSubterms?.length}
				<div
					class="subterms-flyout"
					class:subterms-flyout--left={flyoutPlacement === 'left'}
					style={`top:${flyoutTop}px;`}
					role="presentation"
					onmouseenter={handleFlyoutEnter}
					onmouseleave={handleOptionLeave}
				>
					{#each hoveredSubterms as sub (sub.value)}
						{@const subIcon = iconURL(sub.icon)}
						<label class="option option--subterm">
							<input type="checkbox" value={sub.value} bind:group={value} />
							<span class="option-label">
								{#if subIcon}
									<img alt="" class="option-icon" src={subIcon} />
								{/if}
								{sub.label}
							</span>
						</label>
					{/each}
				</div>
			{/if}
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

	.option {
		align-items: center;
		display: flex;
		gap: 0.35rem;
		justify-content: space-between;
	}

	.subterm-indicator {
		color: var(--color-gray-700);
		height: 1rem;
		width: 1rem;
	}

	.subterm-button {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		padding: 0.25rem;
	}

	.subterm-button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.dropdown-panel {
		position: relative;
	}

	.subterms-flyout {
		background: white;
		border-radius: 10px;
		box-shadow: var(--shadow-md);
		left: calc(100% - 0.25rem);
		max-height: 320px;
		overflow: auto;
		padding: 0.5rem 0.75rem;
		position: absolute;
		top: 0;
		width: max-content;
		min-width: 0;
		max-width: none;
		text-align: left;
		border: 1px solid var(--color-gray-200);
		z-index: 10;
	}

	.subterms-flyout--left {
		left: auto;
		right: calc(100% - 0.25rem);
	}

	.option--subterm {
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.option-icon {
		height: 1.25rem;
		width: 1.25rem;
		object-fit: contain;
	}
</style>
