<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import saveContainerUser from '$lib/client/saveContainerUser';
	import Dialog from '$lib/components/Dialog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		displayName,
		isAdminOf,
		isCollaboratorOf,
		isHeadOf,
		isMemberOf,
		isObserverOf,
		predicates,
		type User,
		type AnyContainer,
		type Predicate
	} from '$lib/models';
	import type { PageData } from './$types';
	import BadgeDropdown, {
		type BadgeDropdownOption,
		type BadgeDropdownValue
	} from '$lib/components/BadgeDropdown.svelte';
	import tooltip from '$lib/attachments/tooltip';
	import { ability, applicationState } from '$lib/stores';
	import ArrowDownIcon from '~icons/knotdots/arrow-down-circle-lined';
	import EnvelopeIcon from '~icons/flowbite/envelope-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import UserAddIcon from '~icons/flowbite/user-add-outline';
	import saveUser from '$lib/client/saveUser';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	let email: string = $state('');

	const isEditMode = $derived($applicationState.containerDetailView.editable ?? false);

	const roles = ['administrator', 'head', 'collaborator', 'observer'] as const;

	type Role = (typeof roles)[number];

	const roleColors: Record<Role, string> = {
		administrator: 'orange',
		head: 'yellow',
		collaborator: 'indigo',
		observer: 'gray'
	};

	const rolePredicates: Record<Role, Predicate> = {
		administrator: predicates.enum['is-admin-of'],
		head: predicates.enum['is-head-of'],
		collaborator: predicates.enum['is-collaborator-of'],
		observer: predicates.enum['is-member-of']
	};

	const roleRelationPredicates = new Set<Predicate>(Object.values(rolePredicates));

	let roleOverrides = new SvelteMap<string, Role | null>();
	let pendingRemovals = new SvelteSet<string>();

	const organizationColumns = $derived([
		{ container: data.container },
		...data.managedOrganizationalUnits.map((container) => ({
			container
		}))
	]);

	const roleOptions: BadgeDropdownOption[] = roles.map((role) => ({
		label: $_(`role.${role}`),
		value: role,
		badgeColor: roleColors[role]
	}));

	const allUsers = $derived.by(() => {
		return [...data.users].sort((a, b) => displayName(a).localeCompare(displayName(b)));
	});

	const searchedUsers = $derived.by(() => {
		const terms = page.url.searchParams.get('terms')?.trim().toLocaleLowerCase() ?? '';
		if (!terms) return allUsers;

		return allUsers.filter((user) =>
			`${displayName(user)} ${user.email}`.toLocaleLowerCase().includes(terms)
		);
	});

	const facets = $derived.by(() => {
		const roleCounts = new Map<string, number>(roles.map((role) => [role, 0]));

		for (const user of searchedUsers) {
			const userRoles = new Set<Role>();
			for (const { container } of organizationColumns) {
				const role = visibleRoleFor(user, container);
				if (role) userRoles.add(role);
			}
			for (const role of userRoles) {
				roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
			}
		}

		return new Map([['role', roleCounts]]);
	});

	const users = $derived.by(() => {
		const selectedRoles = page.url.searchParams.getAll('role').filter(isRole);
		if (selectedRoles.length === 0) return searchedUsers;

		return searchedUsers.filter((user) =>
			organizationColumns.some(({ container }) => {
				const role = visibleRoleFor(user, container);
				return role && selectedRoles.includes(role);
			})
		);
	});

	function roleFor(user: User, container: AnyContainer): Role | undefined {
		if (isAdminOf(user, container)) return 'administrator';
		if (isHeadOf(user, container)) return 'head';
		if (isCollaboratorOf(user, container)) return 'collaborator';
		if (isObserverOf(user, container) || isMemberOf(user, container)) return 'observer';
	}

	function roleKey(user: User, container: AnyContainer) {
		return `${user.guid}:${container.guid}`;
	}

	function visibleRoleFor(user: User, container: AnyContainer) {
		const key = roleKey(user, container);
		if (roleOverrides.has(key)) return roleOverrides.get(key) ?? undefined;
		return roleFor(user, container);
	}

	function isRole(value: BadgeDropdownValue): value is Role {
		return typeof value === 'string' && roles.includes(value as Role);
	}

	async function saveRole(user: User, container: AnyContainer, role: BadgeDropdownValue) {
		if (role != null && !isRole(role)) return;

		const key = roleKey(user, container);
		const hadPrevious = roleOverrides.has(key);
		const previous = roleOverrides.get(key);
		roleOverrides.set(key, role ?? null);

		const userRelations = container.user.filter(({ predicate, subject }) => {
			if (subject !== user.guid) return true;
			return !roleRelationPredicates.has(predicate);
		});

		if (isRole(role)) {
			userRelations.push({
				subject: user.guid,
				predicate: rolePredicates[role]
			});
		}

		const response = await saveContainerUser({ ...container, user: userRelations });

		if (!response.ok) {
			if (hadPrevious) roleOverrides.set(key, previous ?? null);
			else roleOverrides.delete(key);
			console.log(await response.json());
			return;
		}

		await invalidateAll();
		roleOverrides.delete(key);
	}

	function removableContainersFor(user: User) {
		return organizationColumns
			.map(({ container }) => container)
			.filter((container) => roleFor(user, container))
			.filter((container) => $ability.can('update', container));
	}

	function canRemoveUser(user: User) {
		if (!isEditMode || pendingRemovals.has(user.guid)) return false;

		const roleContainers = organizationColumns
			.map(({ container }) => container)
			.filter((container) => roleFor(user, container));

		return (
			roleContainers.length > 0 &&
			roleContainers.every((container) => $ability.can('update', container))
		);
	}

	async function logResponse(response: Response) {
		try {
			console.log(await response.json());
		} catch {
			console.log(response.statusText);
		}
	}

	async function removeUser(user: User) {
		const containers = removableContainersFor(user);
		if (containers.length === 0) return;

		pendingRemovals.add(user.guid);

		try {
			const responses = await Promise.all(
				containers.map((container) =>
					saveContainerUser({
						...container,
						user: container.user.filter(({ predicate, subject }) => {
							if (subject !== user.guid) return true;
							return !roleRelationPredicates.has(predicate);
						})
					})
				)
			);

			const failedResponses = responses.filter((response) => !response.ok);
			if (failedResponses.length > 0) {
				await Promise.all(failedResponses.map(logResponse));
				alert($_('user.remove_failure'));
			}

			await invalidateAll();
		} catch (error) {
			console.log(error);
			alert($_('user.remove_failure'));
		} finally {
			pendingRemovals.delete(user.guid);
		}
	}

	function handleInvite(container: AnyContainer) {
		return async (event: Event) => {
			event.preventDefault();

			try {
				const response = await saveUser({ email, container });
				if (!response.ok) {
					console.log(await response.json());
					alert($_('invite.failure'));
					return;
				}

				email = '';
				await invalidateAll();
				dialog.close();
			} catch (error) {
				console.log(error);
				alert($_('invite.failure'));
			}
		};
	}
</script>

<Dialog bind:dialog>
	<form onsubmit={handleInvite(data.container)}>
		<h3>{$_('invite.heading')}</h3>
		<label>
			{$_('invite.email')}
			<!-- svelte-ignore a11y_autofocus -->
			<input type="email" bind:value={email} autofocus required />
		</label>
		<button class="button-primary" type="submit">{$_('invite.submit')}</button>
	</form>
</Dialog>

<Layout>
	{#snippet header()}
		{#snippet commands()}
			{#if $ability.can('invite-members', data.container)}
				<button
					class="button button-xs button-primary"
					type="button"
					onclick={() => dialog.showModal()}
				>
					<UserAddIcon />
					<span>{$_('invite.heading')}</span>
				</button>
			{/if}
		{/snippet}

		<Header search {facets} sortOptions={[]} {commands} />
	{/snippet}

	{#snippet main()}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th class="col-name">
							<span class="header-content">
								<UserIcon />
								<span class="header-label">{$_('user.display_name')}</span>
							</span>
						</th>
						<th class="col-email">
							<span class="header-content">
								<EnvelopeIcon />
								<span class="header-label">{$_('user.email')}</span>
							</span>
						</th>
						{#each organizationColumns as org (org.container.guid)}
							<th class="col-role">
								<span class="header-content" {@attach tooltip(org.container.payload.name)}>
									<ArrowDownIcon />
									<span class="header-label">{org.container.payload.name}</span>
								</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each users as user (user.guid)}
						{@const signedUp = user.family_name || user.given_name}
						<tr>
							<td class={['col-name', !signedUp && 'not-signed-up']}>
								<div>
									{signedUp ? displayName(user) : $_('user.invitation_sent')}
									{#if canRemoveUser(user)}
										<button
											{@attach tooltip($_('user.remove'))}
											class="action-button action-button--padding-tight is-visible-on-hover"
											disabled={pendingRemovals.has(user.guid)}
											onclick={() => removeUser(user)}
											type="button"
										>
											<TrashBinIcon />
										</button>
									{/if}
								</div>
							</td>
							<td class="col-email">{user.email}</td>
							{#each organizationColumns as org (org.container.guid)}
								{@const canEdit = isEditMode && $ability.can('update', org.container)}
								{@const role = visibleRoleFor(user, org.container)}
								<td class="col-role">
									{#if role}
										<BadgeDropdown
											value={role}
											options={roleOptions}
											editable={canEdit}
											emptyLabel={$_('role.none')}
											onchange={(role) => saveRole(user, org.container, role)}
										/>
									{:else if canEdit}
										<BadgeDropdown
											value={role}
											options={roleOptions}
											editable={canEdit}
											emptyLabel={$_('role.none')}
											onchange={(role) => saveRole(user, org.container, role)}
										/>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/snippet}
</Layout>

<style>
	.table-wrapper {
		margin: 1rem 1.5rem 0;
		overflow: auto;
		position: relative;
	}

	table {
		border-collapse: separate;
		border-spacing: 0;
		width: max-content;
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
	}

	th,
	td {
		border-right: 1px solid var(--color-gray-100);
		padding: 0.5rem;
		white-space: nowrap;
	}

	th:last-child,
	td:last-child {
		border-right: none;
	}

	th {
		color: var(--color-gray-600);
		font-weight: 400;
	}

	td {
		color: var(--color-gray-800);
		font-weight: 500;
		height: 3.25rem;
		padding: 0.625rem 0.5rem;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	.not-signed-up {
		color: var(--color-gray-500);
		font-style: italic;
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

	.header-content {
		align-items: center;
		display: flex;
		gap: 0.375rem;
	}

	.header-content :global(svg) {
		height: 1rem;
		flex-shrink: 0;
		width: 1rem;
	}

	.header-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-name,
	.col-email {
		min-width: 14.75rem;
		width: 14.75rem;
	}

	.col-name > div {
		align-items: center;
		display: flex;
		justify-content: space-between;
	}

	.col-role {
		max-width: 12rem;
		width: 12rem;
	}

	@media (hover: hover) {
		td:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
