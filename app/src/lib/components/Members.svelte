<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-solid';
	import UserAdd from '~icons/flowbite/user-add-outline';
	import { invalidateAll } from '$app/navigation';
	import saveContainerUser from '$lib/client/saveContainerUser';
	import saveUser from '$lib/client/saveUser';
	import Dialog from '$lib/components/Dialog.svelte';
	import {
		displayName,
		isAdminOf,
		isCollaboratorOf,
		isHeadOf,
		isObserverOf,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		predicates
	} from '$lib/models';
	import type { AnyContainer, User } from '$lib/models';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: AnyContainer;
		users: Readonly<Array<User>>;
	}

	let { container, users }: Props = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	let email: string = $state('');

	function handleChangeRole(user: User, container: AnyContainer) {
		return async (event: { currentTarget: HTMLSelectElement }) => {
			let containerUser;
			switch (event.currentTarget.value) {
				case 'role.administrator':
					containerUser = container.user
						.filter(
							({ predicate, subject }) =>
								predicate == predicates.enum['is-member-of'] || user.guid != subject
						)
						.concat({
							subject: user.guid,
							predicate: predicates.enum['is-admin-of']
						});
					break;
				case 'role.collaborator':
					containerUser = container.user
						.filter(
							({ predicate, subject }) =>
								predicate == predicates.enum['is-member-of'] || user.guid != subject
						)
						.concat({
							subject: user.guid,
							predicate: predicates.enum['is-collaborator-of']
						});
					break;
				case 'role.head':
					containerUser = container.user
						.filter(
							({ predicate, subject }) =>
								predicate == predicates.enum['is-member-of'] || user.guid != subject
						)
						.concat({
							subject: user.guid,
							predicate: predicates.enum['is-head-of']
						});
					break;
				case 'role.observer':
					containerUser = container.user.filter(
						({ predicate, subject }) =>
							predicate == predicates.enum['is-member-of'] || user.guid != subject
					);
					break;
				default:
					containerUser = container.user;
			}

			const response = await saveContainerUser({ ...container, user: containerUser });
			if (!response.ok) {
				console.log(await response.json());
			}

			await invalidateAll();
		};
	}

	async function handleRemoveRelations(user: User, container: AnyContainer) {
		const response = await saveContainerUser({
			...container,
			user: [
				...container.user.filter(
					({ predicate, subject }) =>
						subject != user.guid ||
						(predicate != predicates.enum['is-admin-of'] &&
							predicate != predicates.enum['is-head-of'] &&
							predicate != predicates.enum['is-collaborator-of'] &&
							predicate != predicates.enum['is-member-of'])
				)
			]
		});
		if (!response.ok) {
			console.log(await response.json());
		}
		await invalidateAll();
	}

	function handleInvite(container: AnyContainer) {
		return async (event: Event) => {
			event.preventDefault();

			try {
				await saveUser({ email, container });
				email = '';
				await invalidateAll();
			} catch (error) {
				console.log(error);
				alert($_('invite.failure'));
			}

			dialog.close();
		};
	}
</script>

<table>
	<thead>
		<tr>
			<th scope="col">{$_('user.email')}</th>
			<th scope="col">{$_('user.role')}</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each users as u (u.guid)}
			<tr>
				<td>{displayName(u)}</td>
				<td>
					{#key container.user}
						<select name="role" onchange={handleChangeRole(u, container)}>
							<option value="role.observer" selected={isObserverOf(u, container)}>
								{$_('role.observer')}
							</option>
							<option value="role.collaborator" selected={isCollaboratorOf(u, container)}>
								{$_('role.collaborator')}
							</option>
							<option value="role.head" selected={isHeadOf(u, container)}>
								{$_('role.head')}
							</option>
							{#if isOrganizationContainer(container) || isOrganizationalUnitContainer(container)}
								<option value="role.administrator" selected={isAdminOf(u, container)}>
									{$_('role.administrator')}
								</option>
							{/if}
						</select>
					{/key}
				</td>
				<td>
					<button
						class="action-button"
						type="button"
						{@attach tooltip($_('user.remove_relations'))}
						onclick={() => handleRemoveRelations(u, container)}
					>
						<TrashBin />
					</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
<div class="content-actions">
	<button class="button-primary" type="button" onclick={() => dialog.showModal()}>
		<UserAdd />
	</button>
</div>

<Dialog bind:dialog>
	<form onsubmit={handleInvite(container)}>
		<h3>{$_('invite.heading')}</h3>
		<label>
			{$_('invite.email')}
			<!-- svelte-ignore a11y_autofocus -->
			<input type="email" bind:value={email} autofocus required />
		</label>
		<button class="button-primary" type="submit">{$_('invite.submit')}</button>
	</form>
</Dialog>

<style>
	td:last-child {
		text-align: right;
	}

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

	form input {
		display: block;
		width: 100%;
	}

	table {
		overflow-x: auto;
	}
</style>
