<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import UserPlus from '~icons/heroicons/user-plus-20-solid';
	import { invalidateAll } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import Dialog from '$lib/components/Dialog.svelte';
	import saveContainerUser from '$lib/client/saveContainerUser';
	import saveUser from '$lib/client/saveUser';
	import { isAdminOf, predicates } from '$lib/models';
	import type { AnyContainer, User } from '$lib/models';

	export let container: AnyContainer;
	export let users: Readonly<Array<User>>;

	let dialog: HTMLDialogElement;
	let email: string;

	function handleChangeRole(user: User, container: AnyContainer) {
		return async (event: { currentTarget: HTMLSelectElement }) => {
			let containerUser;
			switch (event.currentTarget.value) {
				case 'role.member':
					containerUser = container.user.filter(
						({ predicate, subject }) =>
							predicate != predicates.enum['is-admin-of'] || user.guid != subject
					);
					break;
				case 'role.administrator':
					containerUser = container.user
						.filter(
							({ predicate, subject }) =>
								predicate != predicates.enum['is-admin-of'] || user.guid != subject
						)
						.concat({
							subject: user.guid,
							predicate: predicates.enum['is-admin-of']
						});
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
							predicate != predicates.enum['is-member-of'])
				)
			]
		});
		if (!response.ok) {
			console.log(await response.json());
		}
		await invalidateAll();
	}

	async function handleInvite() {
		try {
			const userResponse = await saveUser({
				email,
				organization: container.organization,
				realm: env.PUBLIC_KC_REALM as string
			});
			const userResponseData = await userResponse.json();
			await saveContainerUser({
				...container,
				user: [
					...container.user,
					{ subject: userResponseData.guid, predicate: predicates.enum['is-member-of'] }
				]
			});
			email = '';
			await invalidateAll();
		} catch (error) {
			console.log(error);
			alert($_('invite.failure'));
		}
		dialog.close();
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
				<td>{u.display_name}</td>
				<td>
					{#key container.user}
						<select name="role" on:change={handleChangeRole(u, container)}>
							<option value="role.member" selected={!isAdminOf(u, container)}>
								{$_('role.member')}
							</option>
							<option value="role.administrator" selected={isAdminOf(u, container)}>
								{$_('role.administrator')}
							</option>
						</select>
					{/key}
				</td>
				<td>
					<button
						class="quiet"
						type="button"
						title={$_('user.remove_relations')}
						on:click={() => handleRemoveRelations(u, container)}
					>
						<Trash />
					</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
<div class="content-actions">
	<button class="primary" type="button" on:click={() => dialog.showModal()}>
		<UserPlus />
	</button>
</div>

<Dialog bind:dialog>
	<form on:submit|preventDefault={handleInvite}>
		<h3>{$_('invite.heading')}</h3>
		<label>
			{$_('invite.email')}
			<!-- svelte-ignore a11y-autofocus -->
			<input type="email" bind:value={email} autofocus required />
		</label>
		<button class="primary" type="submit">{$_('invite.submit')}</button>
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
