<script lang="ts">
	import { Combobox } from 'melt/builders';
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import Close from '~icons/flowbite/close-outline';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		options: Array<{ group?: string; href?: string; label: string; value: string }>;
		value: string[];
	}

	let { editable = false, labelledBy, options, value = $bindable() }: Props = $props();

	let root = $state<HTMLElement>();
	let searchInput = $state<HTMLInputElement>();

	// Selection changes need to reach the surrounding form's oninput-based
	// auto-save, which option clicks and badge buttons do not trigger natively.
	function requestSubmit() {
		root?.closest('form')?.requestSubmit();
	}

	const combobox = new Combobox<string, true>({
		multiple: true,
		sameWidth: true,
		// melt only treats its input and content as "inside"; the badges and the
		// chevron/clear-all button of this field must not dismiss the popover.
		// Detached targets are kept open too: opening swaps the chevron icon,
		// which unmounts the click target before melt's document-level handler
		// sees it, so a disconnected node is a re-render inside the field, not
		// an outside click.
		closeOnOutsideClick: (element) =>
			element instanceof Node &&
			element.isConnected &&
			root != undefined &&
			!root.contains(element),
		value: () => value,
		onValueChange(next) {
			value = [...next];
			requestSubmit();
		}
	});

	let selectedOptions = $derived(options.filter((o) => value.includes(o.value)));

	let filteredOptions = $derived(
		options.filter(({ label }) =>
			label.toLowerCase().includes(combobox.inputValue.trim().toLowerCase())
		)
	);

	// Options are grouped (e.g. programs by organizational unit), groups ordered
	// alphabetically; ungrouped options come without a heading.
	let groupedOptions = $derived(
		[...new Set(filteredOptions.map(({ group }) => group))]
			.toSorted((a, b) => (a ?? '').localeCompare(b ?? ''))
			.map((group) => ({
				group,
				options: filteredOptions.filter((option) => option.group === group)
			}))
	);

	// Clicks on the field open the combobox; the buttons within (badge remove,
	// clear all, chevron) keep their own behaviour. composedPath is used because
	// the buttons' contents re-render during the click, which detaches
	// event.target before this bubbling handler runs.
	async function handleFieldClick(event: MouseEvent) {
		if (event.composedPath().some((node) => node instanceof HTMLButtonElement)) {
			return;
		}
		await openAndFocus();
	}

	function remove(removedValue: string) {
		value = value.filter((v) => v !== removedValue);
		requestSubmit();
	}

	function removeAll() {
		value = [];
		combobox.inputValue = '';
		requestSubmit();
	}

	// melt's own trigger handler focuses the search input synchronously, while
	// it is still hidden; focus it again once it has become visible.
	async function openAndFocus() {
		combobox.open = true;
		await tick();
		searchInput?.focus();
	}
</script>

{#if editable}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div bind:this={root} class="combobox">
		<div
			class="combobox-field"
			class:combobox-field--expanded={combobox.open}
			onclick={handleFieldClick}
		>
			<!-- Without a selection the open field stays a single line holding
			     just the search input. -->
			{#if selectedOptions.length > 0 || !combobox.open}
				<span class="combobox-badges">
					{#each selectedOptions as selectedOption (selectedOption.value)}
						<span class="combobox-badge">
							<span class="combobox-badge-label">{selectedOption.label}</span>
							<button
								aria-label={$_('remove')}
								onclick={() => remove(selectedOption.value)}
								type="button"
							>
								<Close />
							</button>
						</span>
					{/each}
					{#if !combobox.open && selectedOptions.length === 0}
						<span class="combobox-empty">{$_('empty')}</span>
					{/if}
				</span>
			{/if}
			<!-- The input spans the whole field so the panel matches its width
			     via sameWidth. -->
			<input
				{...combobox.input}
				aria-labelledby={labelledBy}
				autocomplete="off"
				bind:this={searchInput}
				class="combobox-input"
				class:combobox-input--hidden={!combobox.open}
			/>
			<!-- One persistent trigger: unmounting it on open would break melt's
			     focus tracking and close the popover again. While open, the design
			     turns it into the clear-all button, overriding melt's toggle. -->
			<button
				{...combobox.trigger}
				aria-label={combobox.open ? $_('remove_all') : undefined}
				aria-labelledby={combobox.open ? undefined : labelledBy}
				class="combobox-toggle"
				onclick={combobox.open ? removeAll : openAndFocus}
				type="button"
			>
				{#if combobox.open}<CloseCircle />{:else}<ChevronSort />{/if}
			</button>
		</div>
		<div {...combobox.content} class="combobox-panel">
			<ul>
				{#each groupedOptions as { group, options: groupOptions } (group ?? '')}
					{#if group != undefined}
						<li aria-hidden="true" class="combobox-group">{group}</li>
					{/if}
					{#each groupOptions as option (option.value)}
						<li {...combobox.getOption(option.value, option.label)} class="combobox-option">
							<input
								aria-hidden="true"
								checked={combobox.isSelected(option.value)}
								tabindex="-1"
								type="checkbox"
							/>
							<span class="combobox-option-label">{option.label}</span>
						</li>
					{/each}
				{/each}
			</ul>
		</div>
	</div>
{:else}
	<div class="combobox-badges value value--read-only">
		{#each selectedOptions as selectedOption (selectedOption.value)}
			<span class="combobox-badge">
				{#if selectedOption.href}
					<a class="combobox-badge-label" href={selectedOption.href}>{selectedOption.label}</a>
				{:else}
					<span class="combobox-badge-label">{selectedOption.label}</span>
				{/if}
			</span>
		{:else}
			<span class="combobox-empty">{$_('empty')}</span>
		{/each}
	</div>
{/if}

<style>
	.combobox {
		position: relative;
	}

	/* :global because the svgs come from the icon components and do not carry
	   this component's scoping class */
	.combobox :global(svg) {
		flex-shrink: 0;
		height: 16px;
		width: 16px;
	}

	.combobox-field {
		background-color: var(--color-surface-accent-default);
		border: solid 1px var(--color-border-accent-muted);
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.375rem;
		position: relative;
	}

	.combobox-field--expanded {
		background:
			linear-gradient(
				var(--color-background-accent-expanded),
				var(--color-background-accent-expanded)
			),
			linear-gradient(var(--color-surface-accent-default), var(--color-surface-accent-default));
		border: solid 2px var(--color-border-accent-strong);
		padding: calc(0.375rem - 1px);
	}

	.combobox-badges {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		min-height: 24px;
		min-width: 0;
	}

	/* keep badges clear of the icon button */
	.combobox-field > .combobox-badges {
		padding-right: 1.75rem;
	}

	.combobox-badge {
		align-items: center;
		background-color: var(--color-indigo-100);
		border: solid 1px var(--color-white);
		border-radius: 6px;
		color: var(--color-indigo-700);
		display: inline-flex;
		font-size: 0.75rem;
		font-weight: 500;
		gap: 0.25rem;
		line-height: 0.75rem;
		max-width: 100%;
		min-height: 24px;
		padding: 2px 0.375rem;
	}

	.combobox-badge-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.combobox-badge a {
		color: inherit;
	}

	.combobox-badge > button {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		flex-shrink: 0;
		padding: 0;
	}

	.combobox-badge > button:active,
	.combobox-badge > button:hover {
		background: transparent;
	}

	/* The negative margins cancel the field's padding and border so the input
	   spans the field's full outer width; the panel inherits that width via
	   sameWidth and lines up flush with the field. The paddings put the text
	   back where the badges are. */
	.combobox-input {
		background: transparent;
		border: none;
		color: var(--color-text-accent-strong);
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0 calc(-0.375rem - 1px);
		min-height: 24px;
		outline: none;
		padding: 0 calc(2.125rem + 1px) 0 calc(0.75rem + 1px);
		width: calc(100% + 0.75rem + 2px);
	}

	.combobox-input--hidden {
		display: none;
	}

	.combobox-empty {
		color: var(--color-text-accent-muted);
		padding-left: 0.375rem;
	}

	.combobox-toggle {
		background: transparent;
		border: none;
		color: var(--color-icon-accent-subtle);
		cursor: pointer;
		display: inline-flex;
		padding: 0;
		position: absolute;
		right: 0.375rem;
		/* centers the 16px icon on the 24px first line */
		top: 0.625rem;
	}

	.combobox-toggle:active,
	.combobox-toggle:hover {
		background: transparent;
	}

	/* the 2px border eats into the padding; compensate to keep the icon
	   centered on the first line */
	.combobox-field--expanded > .combobox-toggle {
		top: calc(0.625rem - 1px);
	}

	.combobox-panel {
		background-color: var(--color-surface-accent-default);
		border: solid 1px var(--color-border-accent-subtle);
		border-radius: 12px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px 0 rgba(0, 0, 0, 0.05);
		/* the user agent centers [popover] elements via margin: auto */
		margin: 0;
		padding: 0.25rem;
	}

	.combobox-panel > ul {
		list-style: none;
		margin: 0;
		max-height: 20rem;
		overflow-y: auto;
		padding: 0;
	}

	.combobox-group {
		color: var(--color-text-accent-subtle);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.5rem 0.25rem;
	}

	.combobox-option {
		border-radius: 8px;
		cursor: pointer;
		padding: 0.5rem 0.5rem 0.5rem 2rem;
		position: relative;
	}

	.combobox-option:hover,
	.combobox-option[data-highlighted] {
		background-color: var(--color-background-accent-hover);
	}

	.combobox-option > input[type='checkbox'] {
		accent-color: var(--color-accent-on-default);
		background-color: var(--color-background-accent-subtle);
		border: solid 0.5px var(--color-border-accent-default);
		border-radius: 4px;
		height: 16px;
		left: 0.5rem;
		/* the user agent gives checkboxes a default margin, which would shift
		   the absolute position */
		margin: 0;
		pointer-events: none;
		position: absolute;
		top: calc(50% - 8px);
		width: 16px;
	}

	.combobox-option-label {
		color: var(--color-text-accent-default);
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
