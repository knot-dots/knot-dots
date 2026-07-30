<script lang="ts">
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import Close from '~icons/flowbite/close-outline';
	import requestSubmit from '$lib/client/requestSubmit';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{ group?: string; href?: string; label: string; value: string }>;
		value: string[];
	}

	let {
		editable = false,
		labelledBy,
		offset = [0, 4],
		options,
		value = $bindable()
	}: Props = $props();

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset } }]
	};

	let root = $state<HTMLElement>();
	let searchInput = $state<HTMLInputElement>();
	let expanded = $state(false);
	let query = $state('');

	let selectedOptions = $derived(options.filter((o) => value.includes(o.value)));

	let filteredOptions = $derived(
		options.filter(({ label }) => label.toLowerCase().includes(query.trim().toLowerCase()))
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

	async function expand() {
		expanded = true;
		await tick();
		searchInput?.focus();
	}

	function collapse() {
		expanded = false;
		query = '';
	}

	// Clicks on the field expand the combobox; the buttons within (badge remove,
	// clear all, chevron) keep their own behaviour. composedPath is used because
	// the buttons' contents re-render during the click, which detaches
	// event.target before this bubbling handler runs.
	function handleFieldClick(event: MouseEvent) {
		if (event.composedPath().some((node) => node instanceof HTMLButtonElement)) {
			return;
		}
		if (expanded) {
			searchInput?.focus();
		} else {
			expand();
		}
	}

	function handleWindowPointerDown(event: PointerEvent) {
		if (expanded && root && !event.composedPath().includes(root)) {
			collapse();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			collapse();
		}
	}

	// The option list is filtered by the search query, so a plain bind:group
	// would drop selected values whose checkboxes are not rendered; toggling
	// must only ever touch the value it belongs to.
	function toggle(toggledValue: string, checked: boolean) {
		value = checked ? [...value, toggledValue] : value.filter((v) => v !== toggledValue);
	}

	// Button clicks emit no input event, so the surrounding form's oninput-based
	// auto-save must be triggered explicitly.
	function remove(removedValue: string, event: Event) {
		value = value.filter((v) => v !== removedValue);
		requestSubmit(event);
	}

	function removeAll(event: Event) {
		value = [];
		query = '';
		requestSubmit(event);
	}
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

{#if editable}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div bind:this={root} class="dropdown" onkeydown={handleKeyDown} use:popperRef>
		<div class="input-select" class:input-select--expanded={expanded} onclick={handleFieldClick}>
			<span class="badge-wrapper">
				{#each selectedOptions as selectedOption (selectedOption.value)}
					<span class="badge">
						<span class="truncated">{selectedOption.label}</span>
						<button
							aria-label={$_('remove')}
							onclick={(event) => remove(selectedOption.value, event)}
							type="button"
						>
							<Close />
						</button>
					</span>
				{/each}
				{#if expanded}
					<input
						aria-expanded="true"
						aria-labelledby={labelledBy}
						autocomplete="off"
						bind:this={searchInput}
						bind:value={query}
						oninput={(event) => event.stopPropagation()}
						role="combobox"
						type="text"
					/>
				{:else if selectedOptions.length === 0}
					<span class="empty">{$_('empty')}</span>
				{/if}
			</span>
			<span class="icon-wrapper">
				{#if expanded}
					<button aria-label={$_('remove_all')} onclick={removeAll} type="button">
						<CloseCircle />
					</button>
				{:else}
					<button aria-expanded="false" aria-labelledby={labelledBy} onclick={expand} type="button">
						<ChevronSort />
					</button>
				{/if}
			</span>
		</div>
		{#if expanded}
			<div class="combobox-panel" use:popperContent={extraOpts}>
				<ul>
					{#each groupedOptions as { group, options: groupOptions } (group ?? '')}
						{#if group != undefined}
							<li aria-hidden="true" class="group">{group}</li>
						{/if}
						{#each groupOptions as option (option.value)}
							<li>
								<label>
									<input
										checked={value.includes(option.value)}
										onchange={(event) => toggle(option.value, event.currentTarget.checked)}
										type="checkbox"
										value={option.value}
									/>
									<span class="truncated">{option.label}</span>
								</label>
							</li>
						{/each}
					{/each}
				</ul>
			</div>
		{/if}
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
		border-radius: 12px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px 0 rgba(0, 0, 0, 0.05);
		padding: 0.25rem;
		width: 100%;
		z-index: 1;
	}

	.combobox-panel > ul {
		display: flex;
		flex-direction: column;
		max-height: 20rem;
		overflow-y: auto;
	}

	.combobox-panel label {
		align-items: center;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		min-height: 40px;
		padding: 0.5rem;
	}

	.combobox-panel label:hover {
		background-color: var(--color-gray-050);
	}

	.combobox-panel li.group {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.5rem 0.25rem;
	}

	.combobox-panel label > input[type='checkbox'] {
		accent-color: var(--color-primary-700);
		background-color: var(--color-gray-025);
		border: solid 0.5px var(--color-gray-200);
		border-radius: 4px;
		flex-shrink: 0;
		height: 16px;
		width: 16px;
	}

	.combobox-panel label > .truncated {
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 0.875rem;
	}
</style>
