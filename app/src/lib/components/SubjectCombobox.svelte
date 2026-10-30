<script lang="ts">
	import { untrack } from 'svelte';
	import { createCombobox } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import ClearIcon from '~icons/flowbite/close-circle-solid';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import { teamColor } from '$lib/components/TeamChip.svelte';
	import { keycloakUser, type KeycloakUser, type TeamWithMembers } from '$lib/models';

	// what a permission matrix can add as a row: one of the organization's
	// teams, or someone registered in the organization
	export type SubjectSuggestion =
		| { guid: string; kind: 'team'; label: string }
		| { email: string; guid: string; kind: 'user'; label: string };

	interface Props {
		excluded: ReadonlyArray<string>;
		onselect: (suggestion: SubjectSuggestion) => Promise<void> | void;
		// whether the search is open; bound so the matrix can lay out the row
		open?: boolean;
		organization: string;
		teams: ReadonlyArray<TeamWithMembers>;
	}

	let { excluded, onselect, open = $bindable(false), organization, teams }: Props = $props();

	let input: HTMLInputElement | undefined = $state();
	let panel: HTMLDivElement | undefined = $state();
	let anchor: HTMLDivElement | undefined = $state();
	let registeredUsers: KeycloakUser[] = $state([]);
	let registeredUsersLoaded = false;

	const combobox = createCombobox({ label: $_('permission_matrix.add_subject') });

	// fixed keeps the panel out of the scrolling table wrapper; the offset
	// moves it onto the top left corner of the surrounding cell, where the
	// design places it over the row being added
	function cellOffset() {
		const own = anchor?.getBoundingClientRect();
		const cell = anchor?.closest('td')?.getBoundingClientRect();
		return own && cell ? [cell.left - own.left, cell.top - own.bottom] : [0, 0];
	}

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'fixed',
		modifiers: [
			{ name: 'flip', enabled: false },
			{ name: 'offset', options: { offset: cellOffset } }
		]
	});

	// the registered users come from the identity provider, loaded once
	async function loadRegisteredUsers() {
		if (registeredUsersLoaded) {
			return;
		}
		registeredUsersLoaded = true;
		try {
			const response = await fetch(`/container/${organization}/user?registered`, {
				credentials: 'include'
			});
			if (response.ok) {
				registeredUsers = z.array(keycloakUser).parse(await response.json());
			}
		} catch (error) {
			console.log(error);
		}
	}

	function start() {
		open = true;
	}

	function cancel() {
		combobox.reset();
		open = false;
	}

	// the icon in the field clears the search, or closes it once empty
	function clear() {
		if (input && input.value !== '') {
			input.value = '';
			combobox.set({ filter: '' });
			input.focus();
		} else {
			cancel();
		}
	}

	// the search may also open through the binding, so loading starts here
	$effect(() => {
		if (open && input) {
			loadRegisteredUsers();
			input.focus();
			combobox.open();
		}
	});

	// a click anywhere outside the panel closes it
	$effect(() => {
		if (!open) {
			return;
		}
		const onPointerDown = (event: PointerEvent) => {
			if (panel && !panel.contains(event.target as Node)) {
				cancel();
			}
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	});

	const filter = $derived($combobox.filter.trim().toLocaleLowerCase());

	const teamSuggestions = $derived(
		teams
			.filter(({ container }) => !excluded.includes(container.guid))
			.map(({ container }) => ({
				guid: container.guid,
				kind: 'team' as const,
				label: container.payload.name
			}))
			.filter(({ label }) => label.toLocaleLowerCase().includes(filter))
	);

	const userSuggestions = $derived(
		registeredUsers
			.filter(({ id }) => !excluded.includes(id))
			.map((user) => ({
				email: user.email,
				guid: user.id,
				kind: 'user' as const,
				label: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
			}))
			.filter(({ email, label }) => `${label} ${email}`.toLocaleLowerCase().includes(filter))
			.sort((a, b) => a.label.localeCompare(b.label))
	);

	// picking an option hands it over once and closes the search again; the
	// selection is cleared first so later store updates do not repeat it
	$effect(() => {
		const selected = $combobox.selected as SubjectSuggestion | undefined;
		if (!selected) {
			return;
		}
		combobox.set({ selected: undefined });
		untrack(() => {
			cancel();
			onselect(selected);
		});
	});
</script>

<div bind:this={anchor} class="subject-combobox" use:popperRef>
	{#if open}
		<div bind:this={panel} class="dropdown-panel" use:popperContent>
			<div class="combobox-input">
				<input
					use:combobox.input
					autocomplete="off"
					bind:this={input}
					placeholder={$_('search')}
					onkeydown={(event) => event.key === 'Escape' && cancel()}
				/>
				<button aria-label={$_('cancel')} class="clear-button" type="button" onclick={clear}>
					<ClearIcon />
				</button>
			</div>

			<ul class="listbox" use:combobox.items>
				{#if teamSuggestions.length > 0}
					<li class="group-label" role="presentation">
						{$_('permission_matrix.suggestions_teams')}
					</li>
				{/if}
				{#each teamSuggestions as suggestion (suggestion.guid)}
					{@const active = $combobox.active?.guid === suggestion.guid}
					<li class="option" class:active use:combobox.item={{ value: suggestion }}>
						<label>
							<input checked={active} tabindex="-1" type="radio" value={suggestion.guid} />
							<span class="badge badge--large badge--team badge--{teamColor(suggestion.guid)}">
								<span class="truncated">{suggestion.label}</span>
							</span>
						</label>
					</li>
				{/each}
				{#if userSuggestions.length > 0}
					<li class="group-label" role="presentation">
						{$_('permission_matrix.suggestions_users')}
					</li>
				{/if}
				{#each userSuggestions as suggestion (suggestion.guid)}
					{@const active = $combobox.active?.guid === suggestion.guid}
					<li class="option option--user" class:active use:combobox.item={{ value: suggestion }}>
						<label>
							<input checked={active} tabindex="-1" type="radio" value={suggestion.guid} />
							<span class="truncated">{suggestion.label}</span>
						</label>
					</li>
				{/each}
				{#if teamSuggestions.length === 0 && userSuggestions.length === 0}
					<li class="group-label" role="presentation">
						{$_('permission_matrix.no_suggestions')}
					</li>
				{/if}
			</ul>
		</div>
	{:else}
		<button
			class="button-alternate button-xs system-primary add-button"
			type="button"
			onclick={start}
		>
			<PlusIcon />
			<span>{$_('add_item')}</span>
		</button>
	{/if}
</div>

<style>
	/* the design sets the button in the body size, not the small button size */
	.add-button {
		border-radius: 4px;
		font-size: 0.875rem;
		gap: 0.25rem;
		line-height: 1;
		min-height: 1.75rem;
	}

	/* the panel of the design: a raised container the width of the name
	   column, holding the field and the grouped suggestions */
	.dropdown-panel {
		--dropdown-panel-background: var(--color-surface-accent-container);
		--dropdown-panel-border-color: var(--color-border-raised);
		--dropdown-panel-border-radius: 12px;
		--dropdown-panel-gap: 0;
		--dropdown-panel-max-height: 30rem;
		--dropdown-panel-padding: 0.25rem;

		width: 13.625rem;
	}

	.combobox-input {
		align-items: center;
		background: var(--color-surface-default);
		border: 2px solid var(--focus-color);
		border-radius: 8px;
		display: flex;
		gap: 0.25rem;
		min-height: 2.25rem;
		padding: 0 0.25rem 0 0.75rem;
	}

	.combobox-input > input {
		background: none;
		border: none;
		color: var(--color-text-strong);
		flex-grow: 1;
		font-size: 0.875rem;
		font-weight: 500;
		min-height: 0;
		min-width: 0;
		padding: 0;
	}

	.combobox-input > input:focus {
		outline: none;
	}

	.clear-button {
		--padding-x: 0.25rem;
		--padding-y: 0.25rem;

		border: none;
		color: var(--color-icon-default);
	}

	.clear-button > :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.listbox {
		display: flex;
		flex-direction: column;
		list-style: none;
		margin: 0;
	}

	.group-label {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.75rem 0.25rem;
	}

	.option {
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.option > label {
		color: var(--color-text-default);
		font-weight: 500;
		min-height: 2.5rem;
		padding: 0.5rem;
	}

	.option > label > input[type='radio'] {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.option--user > label {
		min-height: 2.75rem;
	}

	.option:hover,
	.option.active {
		background-color: var(--color-gray-100);
	}
</style>
