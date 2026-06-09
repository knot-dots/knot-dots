<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import saveContainerUser from '$lib/client/saveContainerUser';
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
	import { ability, applicationState } from '$lib/stores';
	import ArrowDownIcon from '~icons/knotdots/arrow-down-circle-lined';
	import EnvelopeIcon from '~icons/flowbite/envelope-outline';
	import UserIcon from '~icons/flowbite/user-outline';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const isEditMode = $derived($applicationState.containerDetailView.editable ?? false);

	const roles = ['administrator', 'head', 'collaborator', 'observer'] as const;

	type Role = (typeof roles)[number];

	const roleColors: Record<Role, string> = {
		administrator: 'red',
		head: 'amber',
		collaborator: 'teal',
		observer: 'gray'
	};

	const rolePredicates: Record<Role, Predicate> = {
		administrator: predicates.enum['is-admin-of'],
		head: predicates.enum['is-head-of'],
		collaborator: predicates.enum['is-collaborator-of'],
		observer: predicates.enum['is-member-of']
	};

	const roleRelationPredicates = new Set<Predicate>(Object.values(rolePredicates));

	let roleOverrides = new SvelteMap<string, Role>();

	const organizationColumns = $derived([
		{ container: data.container, users: data.users },
		...data.organizationalUnits
	]);

	const roleOptions: BadgeDropdownOption[] = roles.map((role) => ({
		label: $_(`role.${role}`),
		value: role,
		badgeColor: roleColors[role]
	}));

	const headerIconStyle = 'color: var(--color-gray-500); flex: none;';

	const users = $derived.by(() => {
		const byGuid = new Map<string, User>();
		for (const column of organizationColumns) {
			for (const user of column.users) {
				byGuid.set(user.guid, user);
			}
		}
		return [...byGuid.values()].sort((a, b) => displayName(a).localeCompare(displayName(b)));
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
		return roleOverrides.get(roleKey(user, container)) ?? roleFor(user, container);
	}

	function isRole(value: BadgeDropdownValue): value is Role {
		return typeof value === 'string' && roles.includes(value as Role);
	}

	async function saveRole(user: User, container: AnyContainer, role: BadgeDropdownValue) {
		if (!isRole(role)) return;

		const key = roleKey(user, container);
		const previous = roleOverrides.get(key);
		roleOverrides.set(key, role);

		const userRelations = container.user.filter(({ predicate, subject }) => {
			if (subject !== user.guid) return true;
			return !roleRelationPredicates.has(predicate);
		});

		userRelations.push({
			subject: user.guid,
			predicate: rolePredicates[role]
		});

		const response = await saveContainerUser({ ...container, user: userRelations });

		if (!response.ok) {
			if (previous) roleOverrides.set(key, previous);
			else roleOverrides.delete(key);
			console.log(await response.json());
			return;
		}

		await invalidateAll();
		roleOverrides.delete(key);
	}
</script>

<Layout>
	{#snippet header()}
		<Header workspaceOptions={[]} />
	{/snippet}

	{#snippet main()}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th class="col-name">
							<span class="header-content">
								<UserIcon height="16" style={headerIconStyle} width="16" />
								<span class="header-label">{$_('user.display_name')}</span>
							</span>
						</th>
						<th class="col-email">
							<span class="header-content">
								<EnvelopeIcon height="16" style={headerIconStyle} width="16" />
								<span class="header-label">{$_('user.email')}</span>
							</span>
						</th>
						{#each organizationColumns as org (org.container.guid)}
							<th class="col-role">
								<span class="header-content">
									<ArrowDownIcon height="16" style={headerIconStyle} width="16" />
									<span class="header-label">{org.container.payload.name}</span>
								</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each users as user (user.guid)}
						<tr>
							<td class="col-name">{displayName(user)}</td>
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
											onchange={(role) => saveRole(user, org.container, role)}
										/>
									{:else if canEdit}
										<BadgeDropdown
											value={role}
											options={roleOptions}
											editable={canEdit}
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
		overflow-x: auto;
		padding: 1rem 1.5rem 0;
	}

	table {
		border-collapse: collapse;
		border-style: hidden;
		width: max-content;
	}

	th,
	td {
		border: 1px solid var(--color-gray-100);
		padding: 0.5rem;
		white-space: nowrap;
	}

	th {
		background: white;
		color: var(--color-gray-600);
		font-weight: 400;
		height: 40px;
	}

	td {
		color: var(--color-gray-800);
		font-weight: 500;
		height: 50px;
		padding: 0.625rem 0.5rem;
	}

	.header-content {
		align-items: center;
		display: flex;
		gap: 0.375rem;
		min-width: 0;
	}

	.header-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-name,
	.col-email {
		min-width: 236px;
		width: 236px;
	}

	.col-role {
		max-width: 10rem;
		width: 10rem;
	}
</style>
