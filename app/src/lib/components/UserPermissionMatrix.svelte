<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CheckCircleIcon from '~icons/flowbite/check-circle-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import { grantKindsForRoleOn, grantKindsForRoleOnSubordinates } from '$lib/authorization';
	import {
		type AnyPayload,
		type Container,
		displayName,
		grantKinds,
		type MemberRole,
		memberRoleOf,
		memberRoles,
		type User
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		users: Readonly<Array<User>>;
	}

	let { container, users }: Props = $props();

	// the rights on the container itself and the rights on subordinate objects
	// within it are shown as separate column groups
	const objectKinds = [
		grantKinds.enum.read,
		grantKinds.enum.update,
		grantKinds.enum.delete,
		grantKinds.enum['manage-members']
	];

	const subordinateKinds = [grantKinds.enum.create, grantKinds.enum.update, grantKinds.enum.delete];

	const roleBadgeColors: Record<MemberRole, string> = {
		administrator: 'red',
		head: 'yellow',
		collaborator: 'indigo',
		observer: 'gray'
	};

	// The checkboxes display the effective rights of the user's member role,
	// derived from the actual authorization rules; what a role permits depends
	// on the container type.
	function objectKindsFor(user: User) {
		return grantKindsForRoleOn(container, user, memberRoleOf(user, container));
	}

	function subordinateKindsFor(user: User) {
		return grantKindsForRoleOnSubordinates(container, user, memberRoleOf(user, container));
	}
</script>

<div class="table-wrapper table-wrapper--with-end-padding">
	<table>
		<thead>
			<tr>
				<th class="col-name" rowspan="2">
					<span class="header-content">
						<UserIcon />
						<span class="header-label">{$_('user.display_name')}</span>
					</span>
				</th>
				<th class="col-group" colspan={objectKinds.length} scope="colgroup">
					{$_('permission_matrix.this_object')}
				</th>
				<th class="col-group" colspan={subordinateKinds.length} scope="colgroup">
					{$_('permission_matrix.subordinate_objects')}
				</th>
			</tr>
			<tr>
				{#each objectKinds as kind (kind)}
					<th class="col-grant">
						<span class="header-content">
							<CheckCircleIcon />
							<span class="header-label">{$_(`permission.${kind}`)}</span>
						</span>
					</th>
				{/each}
				{#each subordinateKinds as kind (kind)}
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
				{@const role = memberRoleOf(user, container)}
				{@const effectiveObjectKinds = objectKindsFor(user)}
				{@const effectiveSubordinateKinds = subordinateKindsFor(user)}
				{@const isAdmin = role === memberRoles.enum.administrator}
				<tr>
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
					{#each objectKinds as kind (kind)}
						<td class="col-grant">
							<input
								type="checkbox"
								aria-label={`${$_(`permission.${kind}`)} (${$_('permission_matrix.this_object')})`}
								checked={effectiveObjectKinds.includes(kind)}
								disabled
							/>
						</td>
					{/each}
					{#each subordinateKinds as kind (kind)}
						<td class="col-grant">
							<input
								type="checkbox"
								aria-label={`${$_(`permission.${kind}`)} (${$_('permission_matrix.subordinate_objects')})`}
								checked={effectiveSubordinateKinds.includes(kind)}
								disabled
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
		z-index: 1;
	}

	thead tr:first-child th {
		top: 0;
	}

	th.col-group {
		height: 2.25rem;
	}

	thead tr:nth-child(2) th {
		top: 2.25rem;
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

	th.col-group {
		font-weight: 600;
		text-align: left;
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
</style>
