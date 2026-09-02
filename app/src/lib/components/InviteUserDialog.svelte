<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import saveUser from '$lib/client/saveUser';
	import Dialog from '$lib/components/Dialog.svelte';
	import {
		type AnyPayload,
		type Container,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		type KeycloakUser,
		type MemberRole,
		memberRoles,
		predicates
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		dialog: HTMLDialogElement;
	}

	let { container, dialog = $bindable() }: Props = $props();

	const suggestionsId = $props.id();

	let email = $state('');

	let role: MemberRole = $state(memberRoles.enum.observer);

	const availableRoles = $derived(
		isOrganizationContainer(container) || isOrganizationalUnitContainer(container)
			? memberRoles.options
			: memberRoles.options.filter((option) => option !== memberRoles.enum.administrator)
	);

	let registeredUsers: KeycloakUser[] = $state([]);

	let registeredUsersLoaded = false;

	// suggest addresses registered in the organization, except current members;
	// the name serves as the option label, so typing a name suggests the address
	const suggestions = $derived(
		registeredUsers
			.filter(
				({ id }) =>
					!container.user.some(
						({ predicate, subject }) =>
							subject === id && predicate === predicates.enum['is-member-of']
					)
			)
			.sort((a, b) => a.email.localeCompare(b.email))
	);

	async function loadSuggestions() {
		if (registeredUsersLoaded) {
			return;
		}
		registeredUsersLoaded = true;

		try {
			const response = await fetch(`/container/${container.organization}/user?registered`, {
				credentials: 'include'
			});
			if (!response.ok) {
				return;
			}
			registeredUsers = await response.json();
		} catch (error) {
			console.log(error);
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		try {
			const response = await saveUser({ container, email, role });
			if (!response.ok) {
				console.log(await response.json());
				alert($_('invite.failure'));
				return;
			}

			email = '';
			role = memberRoles.enum.observer;
			await invalidateAll();
			dialog.close();
		} catch (error) {
			console.log(error);
			alert($_('invite.failure'));
		}
	}
</script>

<Dialog bind:dialog>
	<form onsubmit={handleSubmit}>
		<h3>{$_('invite.heading')}</h3>
		<label>
			{$_('invite.email')}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="email"
				autofocus
				required
				class:has-suggestions={suggestions.length > 0}
				list={suggestions.length > 0 ? suggestionsId : undefined}
				onfocus={loadSuggestions}
				bind:value={email}
			/>
		</label>
		<datalist id={suggestionsId}>
			{#each suggestions as suggestion (suggestion.id)}
				<option value={suggestion.email}>
					{[suggestion.firstName, suggestion.lastName].filter(Boolean).join(' ')}
				</option>
			{/each}
		</datalist>
		<label>
			{$_('user.role')}
			<select bind:value={role}>
				{#each availableRoles as option (option)}
					<option value={option}>{$_(`role.${option}`)}</option>
				{/each}
			</select>
		</label>
		<button class="button-primary system-primary" type="submit">{$_('invite.submit')}</button>
	</form>
</Dialog>

<style>
	form h3 {
		margin-bottom: 1rem;
	}

	form button {
		display: block;
		margin-top: 1.5rem;
		width: 100%;
	}

	form label {
		display: block;
		margin-top: 1rem;
	}

	form input,
	form select {
		display: block;
		width: 100%;
	}

	/* show the same chevron as select elements instead of the native picker indicator */
	form input.has-suggestions {
		background-image: url(/src/lib/assets/chevron-down.svg);
		background-position: right 8px center;
		background-repeat: no-repeat;
		background-size: 16px;
		padding-right: 32px;
	}

	form input::-webkit-calendar-picker-indicator {
		display: none !important;
	}
</style>
