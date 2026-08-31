<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import CheckCircleIcon from '~icons/flowbite/check-circle-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import { grantKindsForRoleOn } from '$lib/authorization';
	import saveGrants from '$lib/client/saveGrants';
	import {
		type AnyPayload,
		type Container,
		displayName,
		type GrantKind,
		grantKinds,
		grantKindsForRole,
		type MemberRole,
		memberRoleOf,
		memberRoles,
		roleAfterGrantToggle,
		snapMemberRoles,
		type User
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		users: Readonly<Array<User>>;
	}

	let { container, editable = false, users }: Props = $props();

	const visibleGrantKinds = [
		grantKinds.enum.read,
		grantKinds.enum.update,
		grantKinds.enum.create,
		grantKinds.enum.delete,
		grantKinds.enum['manage-members']
	];

	const roleBadgeColors: Record<MemberRole, string> = {
		administrator: 'red',
		head: 'yellow',
		collaborator: 'indigo',
		observer: 'gray'
	};

	let roleOverrides = new SvelteMap<string, MemberRole | null>();

	// drop an optimistic override only once the reloaded data reflects it —
	// dropping it right after invalidateAll would flash the previous role for
	// a render cycle until the fresh props arrive
	$effect(() => {
		for (const [guid, role] of roleOverrides) {
			const user = users.find((u) => u.guid === guid);
			if (!user || memberRoleOf(user, container) === role) {
				roleOverrides.delete(guid);
			}
		}
	});

	function visibleRoleFor(user: User) {
		if (roleOverrides.has(user.guid)) {
			return roleOverrides.get(user.guid) ?? null;
		}
		return memberRoleOf(user, container);
	}

	// The checkboxes show the effective rights of the user's member role on
	// this container, derived from the actual authorization rules; what a role
	// permits depends on the container type. The same sets serve as snapping
	// candidates when toggling, while container_grant stores the granted
	// role-shaped kinds.
	function kindsFor(user: User) {
		return grantKindsForRoleOn(container, user, visibleRoleFor(user));
	}

	function kindsByRoleFor(user: User) {
		return snapMemberRoles.map(
			(role) => [role, grantKindsForRoleOn(container, user, role)] as const
		);
	}

	async function toggleGrant(user: User, kind: GrantKind, checked: boolean) {
		const role = roleAfterGrantToggle(kindsByRoleFor(user), visibleRoleFor(user), kind, checked);
		if (role === undefined || role === memberRoles.enum.administrator) {
			return;
		}

		const hadPrevious = roleOverrides.has(user.guid);
		const previous = roleOverrides.get(user.guid);
		roleOverrides.set(user.guid, role);

		const response = await saveGrants(container, {
			kinds: role === null ? [] : grantKindsForRole(role),
			subject: user.guid
		});

		if (!response.ok) {
			if (hadPrevious) roleOverrides.set(user.guid, previous ?? null);
			else roleOverrides.delete(user.guid);
			console.log(await response.json());
			return;
		}

		await invalidateAll();
	}
</script>

<div class="table-wrapper table-wrapper--with-end-padding">
	<table>
		<thead>
			<tr>
				<th class="col-name">
					<span class="header-content">
						<UserIcon />
						<span class="header-label">{$_('user.display_name')}</span>
					</span>
				</th>
				{#each visibleGrantKinds as kind (kind)}
					<th class="col-grant">
						<span class="header-content">
							<CheckCircleIcon />
							<span class="header-label">{$_(`permission.${kind}`)}</span>
						</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each users as user (user.guid)}
				{@const role = visibleRoleFor(user)}
				{@const kinds = kindsFor(user)}
				{@const kindsByRole = kindsByRoleFor(user)}
				{@const isAdmin = role === memberRoles.enum.administrator}
				{@const locked = !editable || isAdmin}
				<tr class:locked>
					<td class="col-name">
						<span class="user-cell">
							<span class="user-name">{displayName(user)}</span>
							{#if role}
								<span class={`badge badge--large badge--${roleBadgeColors[role]}`}>
									{isAdmin ? $_('role.admin') : $_(`role.${role}`)}
								</span>
							{/if}
						</span>
					</td>
					{#each visibleGrantKinds as kind (kind)}
						{@const checked = kinds.includes(kind)}
						<td class="col-grant">
							<input
								type="checkbox"
								aria-label={$_(`permission.${kind}`)}
								{checked}
								disabled={locked ||
									roleAfterGrantToggle(kindsByRole, role, kind, !checked) === undefined}
								onchange={(event) => toggleGrant(user, kind, event.currentTarget.checked)}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-wrapper {
		overflow: auto;
		position: relative;
	}

	:global(.details-section) > .table-wrapper {
		margin-left: calc(var(--details-section-padding-x) * -1);
		margin-right: calc(var(--details-section-padding-x) * -1);
		max-width: calc(100% + 2 * var(--details-section-padding-x));
	}

	table {
		border-collapse: separate;
		border-spacing: 0;
		min-width: 100%;
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

	.col-name {
		min-width: 14.75rem;
		width: 14.75rem;
	}

	.col-grant {
		min-width: 7.5rem;
	}

	.user-cell {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.user-name {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	tr.locked td {
		background: repeating-linear-gradient(45deg, #fff5f5, #fff5f5 2px, #ffebeb 2px, #ffebeb 4px);
		cursor: not-allowed;
	}
</style>
