<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-solid';
	import UserAdd from '~icons/flowbite/user-add-outline';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import saveContainerUser from '$lib/client/saveContainerUser';
	import InviteUserDialog from '$lib/components/InviteUserDialog.svelte';
	import UserPermissionMatrix from '$lib/components/UserPermissionMatrix.svelte';
	import { ability } from '$lib/stores';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		displayName,
		isAdminOf,
		isCollaboratorOf,
		isHeadOf,
		isObserverOf,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		predicates
	} from '$lib/models';
	import type { User } from '$lib/models';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: Container<AnyPayload>;
		users: Readonly<Array<User>>;
	}

	let { container, users }: Props = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	const showViewSwitch = $derived(createFeatureDecisions(page.data.features).usePermissionMatrix());

	let view: 'list' | 'matrix' = $state('list');

	function handleChangeRole(user: User, container: Container<AnyPayload>) {
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

	async function handleRemoveRelations(user: User, container: Container<AnyPayload>) {
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
</script>

{#if showViewSwitch}
	<nav class="segmented-button view-switch">
		<label class="button">
			<input class="is-visually-hidden" type="radio" bind:group={view} value="list" />
			{$_('members_view.list')}
		</label>
		<label class="button">
			<input class="is-visually-hidden" type="radio" bind:group={view} value="matrix" />
			{$_('members_view.matrix')}
		</label>
	</nav>
{/if}

{#if view === 'matrix'}
	<UserPermissionMatrix {container} editable={$ability.can('manage-users', container)} {users} />
{:else}
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
{/if}
<div class="content-actions">
	<button class="button-primary system-primary" type="button" onclick={() => dialog.showModal()}>
		<UserAdd />
	</button>
</div>

<InviteUserDialog {container} bind:dialog />

<style>
	.view-switch {
		margin-bottom: 1rem;
		width: fit-content;
	}

	td:last-child {
		text-align: right;
	}

	table {
		overflow-x: auto;
	}
</style>
