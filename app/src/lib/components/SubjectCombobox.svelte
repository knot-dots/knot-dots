<script lang="ts">
	import { untrack } from 'svelte';
	import { createCombobox } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import SearchIcon from '~icons/flowbite/search-outline';
	import { keycloakUser, type KeycloakUser, type TeamWithMembers } from '$lib/models';

	// what a permission matrix can add as a row: one of the organization's
	// teams, or someone registered in the organization; the last group of the
	// list is for those not listed yet: a new team, or an invitation
	export type SubjectSuggestion =
		| { guid: string; kind: 'team'; label: string; members: number }
		| { email: string; guid: string; kind: 'user'; label: string };

	type Option =
		| SubjectSuggestion
		| { guid: 'create-team'; kind: 'create-team' }
		| { guid: 'invite'; kind: 'invite' };

	interface Props {
		excluded: ReadonlyArray<string>;
		oncreateteam?: () => void;
		oninvite?: () => void;
		onselect: (suggestion: SubjectSuggestion) => Promise<void> | void;
		organization: string;
		placeholder?: string;
		teams: ReadonlyArray<TeamWithMembers>;
	}

	let { excluded, oncreateteam, oninvite, onselect, organization, placeholder, teams }: Props =
		$props();

	let open = $state(false);
	let input: HTMLInputElement | undefined = $state();
	let root: HTMLDivElement | undefined = $state();
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
	}

	function cancel() {
		combobox.reset();
		open = false;
	}

	$effect(() => {
		if (open && input) {
			loadRegisteredUsers();
			input.focus();
			combobox.open();
		}
	});

	// a click anywhere outside the field and its list closes the search
	$effect(() => {
		if (!open) {
			return;
		}
		const onPointerDown = (event: PointerEvent) => {
			if (root && !root.contains(event.target as Node)) {
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
			.map(({ container, members }) => ({
				guid: container.guid,
				kind: 'team' as const,
				label: container.payload.name,
				members: members.length
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

	const createTeamOption: Option = { guid: 'create-team', kind: 'create-team' };
	const inviteOption: Option = { guid: 'invite', kind: 'invite' };

	// picking an option hands it over once and closes the search again; the
	// selection is cleared first so later store updates do not repeat it
	$effect(() => {
		const selected = $combobox.selected as Option | undefined;
		if (!selected) {
			return;
		}
		combobox.set({ selected: undefined });
		untrack(() => {
			cancel();
			if (selected.kind === 'create-team') {
				oncreateteam?.();
			} else if (selected.kind === 'invite') {
				oninvite?.();
			} else {
				onselect(selected);
			}
		});
	});
</script>

{#if open}
	<div bind:this={root} class="dropdown subject-combobox">
		<label class="combobox-input focus-indicator" use:popperRef>
			<SearchIcon />
			<input
				use:combobox.input
				autocomplete="off"
				bind:this={input}
				placeholder={placeholder ?? $_('search')}
				onkeydown={(event) => event.key === 'Escape' && cancel()}
			/>
		</label>

		<div class="dropdown-panel" use:popperContent>
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
							<span class="badge badge--large badge--team badge--purple">
								<span class="truncated">{suggestion.label}</span>
							</span>
							<span class="member-count">({suggestion.members})</span>
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
					<li class="option" class:active use:combobox.item={{ value: suggestion }}>
						<label>
							<input checked={active} tabindex="-1" type="radio" value={suggestion.guid} />
							<span class="person">
								<span class="truncated">{suggestion.label}</span>
								{#if suggestion.label !== suggestion.email}
									<span class="email truncated">{suggestion.email}</span>
								{/if}
							</span>
						</label>
					</li>
				{/each}
				{#if teamSuggestions.length === 0 && userSuggestions.length === 0}
					<li class="group-label" role="presentation">
						{$_('permission_matrix.no_suggestions')}
					</li>
				{/if}
				{#if oncreateteam || oninvite}
					<li class="group-label" role="presentation">
						{$_('permission_matrix.suggestions_not_listed')}
					</li>
				{/if}
				{#if oncreateteam}
					<li
						class="option"
						class:active={$combobox.active?.guid === 'create-team'}
						use:combobox.item={{ value: createTeamOption }}
					>
						<span class="truncated">{$_('teams.create_new')}</span>
					</li>
				{/if}
				{#if oninvite}
					<li
						class="option"
						class:active={$combobox.active?.guid === 'invite'}
						use:combobox.item={{ value: inviteOption }}
					>
						<span class="truncated">{$_('permission_matrix.invite_by_email')}</span>
					</li>
				{/if}
			</ul>
		</div>
	</div>
{:else}
	<button class="button-alternate button-xs system-primary" type="button" onclick={start}>
		<PlusIcon />
		<span>{$_('add_item')}</span>
	</button>
{/if}

<style>
	.combobox-input {
		background-color: var(--color-gray-050);
		align-items: center;
		border-radius: 8px;
		display: flex;
		padding-left: 0.5rem;
	}

	.combobox-input:hover,
	.combobox-input:focus-within {
		background-color: var(--color-gray-100);
	}

	.combobox-input > :global(svg) {
		color: var(--color-icon-default);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.combobox-input > input {
		background-color: transparent;
		border: none;
		display: inline-block;
		flex-grow: 0;
		min-height: 1.75rem;
		padding: 0 0.5rem;
	}

	.combobox-input > input:focus {
		outline: none;
	}

	/* the suggestions panel of the design: 320px wide */
	.dropdown-panel {
		--dropdown-panel-border-color: var(--color-border-accent-subtle);
		--dropdown-panel-border-radius: 12px;
		--dropdown-panel-gap: 0;
		--dropdown-panel-max-height: 30rem;
		--dropdown-panel-padding: 0.25rem;
		--dropdown-panel-width: 20rem;
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

	.option > span {
		align-items: center;
		border-radius: 8px;
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding: 0.5rem 0.75rem;
	}

	.option > span:hover {
		background-color: var(--color-gray-100);
	}

	.member-count {
		color: var(--color-text-subtle);
		flex-shrink: 0;
		font-weight: 400;
	}

	.person {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.person .email {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		font-weight: 400;
	}
</style>
