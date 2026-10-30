<script lang="ts">
	import { untrack } from 'svelte';
	import { createCombobox } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import CloseIcon from '~icons/flowbite/close-outline';
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
		organization: string;
		teams: ReadonlyArray<TeamWithMembers>;
	}

	let { excluded, onselect, organization, teams }: Props = $props();

	let open = $state(false);
	let input: HTMLInputElement | undefined = $state();
	let registeredUsers: KeycloakUser[] = $state([]);
	let registeredUsersLoaded = false;

	const combobox = createCombobox({ label: $_('permission_matrix.add_subject') });

	// fixed keeps the suggestions out of the scrolling table wrapper
	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'fixed',
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
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
		loadRegisteredUsers();
	}

	function cancel() {
		combobox.reset();
		open = false;
	}

	$effect(() => {
		if (open && input) {
			input.focus();
			combobox.open();
		}
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

{#if open}
	<div class="dropdown subject-combobox">
		<div class="combobox-input" use:popperRef>
			<input
				use:combobox.input
				autocomplete="off"
				bind:this={input}
				placeholder={$_('search')}
				onkeydown={(event) => event.key === 'Escape' && cancel()}
			/>
			<button
				aria-label={$_('cancel')}
				class="action-button action-button--padding-tight"
				type="button"
				onclick={cancel}
			>
				<CloseIcon />
			</button>
		</div>

		{#if $combobox.expanded}
			<div class="dropdown-panel" use:popperContent>
				<ul class="listbox" use:combobox.items>
					{#if teamSuggestions.length > 0}
						<li class="group-label" role="presentation">
							{$_('permission_matrix.suggestions_teams')}
						</li>
					{/if}
					{#each teamSuggestions as suggestion (suggestion.guid)}
						<li
							class="option"
							class:active={$combobox.active?.guid === suggestion.guid}
							use:combobox.item={{ value: suggestion }}
						>
							<span class="badge badge--large badge--team badge--{teamColor(suggestion.guid)}">
								{suggestion.label}
							</span>
						</li>
					{/each}
					{#if userSuggestions.length > 0}
						<li class="group-label" role="presentation">
							{$_('permission_matrix.suggestions_users')}
						</li>
					{/if}
					{#each userSuggestions as suggestion (suggestion.guid)}
						<li
							class="option"
							class:active={$combobox.active?.guid === suggestion.guid}
							use:combobox.item={{ value: suggestion }}
						>
							<span class="truncated">{suggestion.label}</span>
						</li>
					{/each}
					{#if teamSuggestions.length === 0 && userSuggestions.length === 0}
						<li class="group-label" role="presentation">
							{$_('permission_matrix.no_suggestions')}
						</li>
					{/if}
				</ul>
			</div>
		{/if}
	</div>
{:else}
	<button class="button-alternate button-xs system-primary" type="button" onclick={start}>
		<PlusIcon />
		<span>{$_('add_item')}</span>
	</button>
{/if}

<style>
	.subject-combobox {
		width: 16rem;
	}

	.combobox-input {
		align-items: center;
		display: flex;
		gap: 0.25rem;
	}

	.combobox-input > input {
		border-radius: var(--form-control-border-radius);
		flex-grow: 1;
		min-height: var(--form-control-min-height);
		padding: var(--form-control-padding-y) var(--form-control-padding-x);
	}

	.dropdown-panel {
		width: 16rem;
	}

	.listbox {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		list-style: none;
		margin: 0;
	}

	.group-label {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		padding: 0.5rem 0.75rem 0.125rem;
	}

	.option {
		border-radius: 0.5rem;
		cursor: pointer;
		padding: 0.5rem 0.75rem;
	}

	.option:hover,
	.option.active {
		background-color: var(--color-gray-100);
	}
</style>
