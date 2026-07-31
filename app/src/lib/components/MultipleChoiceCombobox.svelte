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
		// bottom-start keeps the panel flush with the field's left edge (the
		// centered default drifts because melt applies sameWidth only after
		// computing the position); the fixed strategy positions relative to the
		// viewport, matching the top layer the popover is rendered in.
		floatingConfig: {
			computePosition: { placement: 'bottom-start', strategy: 'fixed' },
			offset: { mainAxis: 4 }
		},
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
	<div bind:this={root} class="dropdown">
		<div
			class="input-select"
			class:input-select--expanded={combobox.open}
			onclick={handleFieldClick}
			{@attach (node) => {
				// Anchor the floating panel to the whole field so sameWidth matches
				// its width; melt would otherwise anchor to the hidden search input.
				combobox.triggerEl = node;
				return () => {
					if (combobox.triggerEl === node) {
						combobox.triggerEl = null;
					}
				};
			}}
		>
			<span class="badge-wrapper">
				{#each selectedOptions as selectedOption (selectedOption.value)}
					<span class="badge">
						<span class="truncated">{selectedOption.label}</span>
						<button
							aria-label={$_('remove')}
							onclick={() => remove(selectedOption.value)}
							type="button"
						>
							<Close />
						</button>
					</span>
				{/each}
				<input
					{...combobox.input}
					aria-labelledby={labelledBy}
					autocomplete="off"
					bind:this={searchInput}
					class:hidden={!combobox.open}
				/>
				{#if !combobox.open && selectedOptions.length === 0}
					<span class="empty">{$_('empty')}</span>
				{/if}
			</span>
			<span class="icon-wrapper">
				<!-- One persistent trigger: unmounting it on open would break melt's
				     focus tracking and close the popover again. While open, the design
				     turns it into the clear-all button, overriding melt's toggle. -->
				<button
					{...combobox.trigger}
					aria-label={combobox.open ? $_('remove_all') : undefined}
					aria-labelledby={combobox.open ? undefined : labelledBy}
					onclick={combobox.open ? removeAll : openAndFocus}
					type="button"
				>
					{#if combobox.open}<CloseCircle />{:else}<ChevronSort />{/if}
				</button>
			</span>
		</div>
		<div {...combobox.content} class="combobox-panel">
			<ul>
				{#each groupedOptions as { group, options: groupOptions } (group ?? '')}
					{#if group != undefined}
						<li aria-hidden="true" class="group">{group}</li>
					{/if}
					{#each groupOptions as option (option.value)}
						<li {...combobox.getOption(option.value, option.label)}>
							<input
								aria-hidden="true"
								checked={combobox.isSelected(option.value)}
								tabindex="-1"
								type="checkbox"
							/>
							<span class="truncated">{option.label}</span>
						</li>
					{/each}
				{/each}
			</ul>
		</div>
	</div>
{:else}
	<div class="badge-wrapper value value--read-only">
		{#each selectedOptions as selectedOption (selectedOption.value)}
			<span class="badge">
				{#if selectedOption.href}
					<a class="truncated" href={selectedOption.href}>{selectedOption.label}</a>
				{:else}
					<span class="truncated">{selectedOption.label}</span>
				{/if}
			</span>
		{:else}
			<span class="empty">{$_('empty')}</span>
		{/each}
	</div>
{/if}

<style>
	.input-select {
		background-color: white;
		border: solid 1px var(--color-gray-050);
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		padding: 0.375rem;
	}

	.input-select--expanded {
		background:
			linear-gradient(rgba(63, 131, 248, 0.15), rgba(63, 131, 248, 0.15)),
			linear-gradient(white, white);
		border: solid 2px var(--color-primary-400);
		padding: calc(0.375rem - 1px);
	}

	.badge-wrapper {
		align-items: center;
		display: flex;
		flex: 1 0 0;
		flex-wrap: wrap;
		gap: 0.25rem;
		min-width: 0;
	}

	.badge {
		align-items: center;
		background-color: var(--color-indigo-100);
		border: solid 1px white;
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

	.badge > .truncated {
		min-width: 0;
	}

	.badge a {
		color: inherit;
	}

	.badge-wrapper > input.hidden {
		display: none;
	}

	.badge-wrapper > input {
		background: transparent;
		border: none;
		color: var(--color-gray-900);
		flex: 1 0 0;
		font-size: 0.875rem;
		font-weight: 500;
		min-height: 24px;
		min-width: 120px;
		outline: none;
		padding: 0 0 0 0.375rem;
	}

	.empty {
		color: var(--color-gray-400);
		padding-left: 0.375rem;
	}

	.icon-wrapper {
		display: flex;
		flex-shrink: 0;
		padding: 0.25rem 0;
	}

	.icon-wrapper > button,
	.badge > button {
		--button-active-background: transparent;
		--button-hover-background: transparent;

		align-items: center;
		border: none;
		display: inline-flex;
		flex-shrink: 0;
		padding: 0;
	}

	.badge > button {
		color: var(--color-indigo-700);
		font-size: 0.75rem;
	}

	.icon-wrapper > button {
		color: var(--color-gray-500);
	}

	.combobox-panel {
		background-color: white;
		border: solid 1px var(--color-gray-100);
		/* the user agent centers [popover] elements via margin: auto */
		margin: 0;
		border-radius: 12px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px 0 rgba(0, 0, 0, 0.05);
		padding: 0.25rem;
	}

	.combobox-panel > ul {
		display: flex;
		flex-direction: column;
		max-height: 20rem;
		overflow-y: auto;
	}

	.combobox-panel li.group {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.5rem 0.25rem;
	}

	.combobox-panel li[role='option'] {
		align-items: center;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		min-height: 40px;
		padding: 0.5rem;
	}

	.combobox-panel li[role='option']:hover,
	.combobox-panel li[data-highlighted] {
		background-color: var(--color-gray-050);
	}

	.combobox-panel li[role='option'] > input[type='checkbox'] {
		accent-color: var(--color-primary-700);
		background-color: var(--color-gray-025);
		border: solid 0.5px var(--color-gray-200);
		border-radius: 4px;
		flex-shrink: 0;
		height: 16px;
		pointer-events: none;
		width: 16px;
	}

	.combobox-panel li[role='option'] > .truncated {
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 0.875rem;
	}
</style>
