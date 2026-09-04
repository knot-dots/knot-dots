<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import CheckCircleIcon from '~icons/flowbite/check-circle-outline';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import saveGrants from '$lib/client/saveGrants';
	import BadgeDropdown, { type BadgeDropdownValue } from '$lib/components/BadgeDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		displayName,
		type Grant,
		type GrantKind,
		grantKinds,
		type GrantSet,
		grantSetForRole,
		grantSetForSubjectOn,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		type MemberRole,
		memberRoleMatchingGrantSet,
		memberRoles,
		type User
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		grants: Readonly<Array<Grant>>;
		oninvite?: () => void;
		users: Readonly<Array<User>>;
	}

	let { container, editable = false, grants, oninvite, users }: Props = $props();

	// the matrix edits the granted rights on subordinate objects; the rights on
	// the object itself travel with the role mapping of the role column
	const kindColumns = [
		grantKinds.enum.read,
		grantKinds.enum.update,
		grantKinds.enum.create,
		grantKinds.enum.delete
	];

	// administrators exist on organizations and organizational units only
	const selectableRoles = $derived(
		isOrganizationContainer(container) || isOrganizationalUnitContainer(container)
			? [
					memberRoles.enum.administrator,
					memberRoles.enum.head,
					memberRoles.enum.collaborator,
					memberRoles.enum.observer
				]
			: [memberRoles.enum.head, memberRoles.enum.collaborator, memberRoles.enum.observer]
	);

	const roleColors: Record<MemberRole, string> = {
		administrator: 'orange',
		head: 'yellow',
		collaborator: 'indigo',
		observer: 'gray'
	};

	const roleOptions = $derived(
		selectableRoles.map((role) => ({
			label: $_(`role.${role}`),
			value: role,
			badgeColor: roleColors[role]
		}))
	);

	let setOverrides = new SvelteMap<string, GrantSet>();

	function storedSetFor(user: User) {
		return grantSetForSubjectOn(grants, container.guid, user.guid);
	}

	function sameSet(a: GrantSet, b: GrantSet) {
		return (
			a.self.length === b.self.length &&
			a.subordinates.length === b.subordinates.length &&
			a.self.every((kind) => b.self.includes(kind)) &&
			a.subordinates.every((kind) => b.subordinates.includes(kind))
		);
	}

	// drop an optimistic override only once the reloaded data reflects it —
	// dropping it right after invalidateAll would flash the previous grants for
	// a render cycle until the fresh props arrive
	$effect(() => {
		for (const [guid, set] of setOverrides) {
			const user = users.find((u) => u.guid === guid);
			if (!user || sameSet(storedSetFor(user), set)) {
				setOverrides.delete(guid);
			}
		}
	});

	function visibleSetFor(user: User): GrantSet {
		return setOverrides.get(user.guid) ?? storedSetFor(user);
	}

	function isSelectableRole(value: BadgeDropdownValue): value is MemberRole {
		return typeof value === 'string' && (selectableRoles as string[]).includes(value);
	}

	async function save(user: User, set: GrantSet) {
		const hadPrevious = setOverrides.has(user.guid);
		const previous = setOverrides.get(user.guid);
		setOverrides.set(user.guid, set);

		const response = await saveGrants(container, { subject: user.guid, ...set });

		if (!response.ok) {
			if (hadPrevious && previous) setOverrides.set(user.guid, previous);
			else setOverrides.delete(user.guid);
			console.log(await response.json());
			return;
		}

		await invalidateAll();
	}

	async function changeRole(user: User, value: BadgeDropdownValue) {
		if (!isSelectableRole(value)) {
			return;
		}
		await save(user, grantSetForRole(value));
	}

	async function toggleKind(user: User, kind: GrantKind, checked: boolean) {
		const current = visibleSetFor(user);
		const subordinates = checked
			? [...current.subordinates.filter((k) => k !== kind), kind]
			: current.subordinates.filter((k) => k !== kind);
		await save(user, { self: current.self, subordinates });
	}

	async function removeSubject(user: User) {
		await save(user, { self: [], subordinates: [] });
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
				<th class="col-role">
					<span class="header-content">
						<span class="header-label">{$_('user.role')}</span>
					</span>
				</th>
				{#each kindColumns as kind (kind)}
					<th class="col-grant">
						<span class="header-content">
							<CheckCircleIcon />
							<span class="header-label">{$_(`permission.${kind}`)}</span>
						</span>
					</th>
				{/each}
				<th class="col-actions"></th>
			</tr>
		</thead>
		<tbody>
			{#each users as user (user.guid)}
				{@const set = visibleSetFor(user)}
				<tr>
					<td class="col-name" class:locked={!editable}>
						<span class="user-cell">
							<span class="user-name">{displayName(user)}</span>
						</span>
					</td>
					<td class="col-role" class:locked={!editable}>
						<BadgeDropdown
							allowEmpty={false}
							value={memberRoleMatchingGrantSet(set) ?? undefined}
							options={roleOptions}
							{editable}
							emptyLabel={$_('role.custom')}
							onchange={(value) => changeRole(user, value)}
						/>
					</td>
					{#each kindColumns as kind (kind)}
						<td class="col-grant" class:locked={!editable}>
							<input
								type="checkbox"
								aria-label={$_(`permission.${kind}`)}
								checked={set.subordinates.includes(kind)}
								disabled={!editable}
								onchange={(event) => toggleKind(user, kind, event.currentTarget.checked)}
							/>
						</td>
					{/each}
					<td class="col-actions" class:locked={!editable}>
						{#if editable}
							<button
								aria-label={$_('user.remove')}
								class="quiet remove-button"
								type="button"
								onclick={() => removeSubject(user)}
							>
								<TrashBinIcon />
							</button>
						{/if}
					</td>
				</tr>
			{/each}
			{#if oninvite}
				<tr class="add-row">
					<td colspan={3 + kindColumns.length}>
						<button class="quiet add-button" type="button" onclick={oninvite}>
							<PlusIcon />
							<span>{$_('add_item')}</span>
						</button>
					</td>
				</tr>
			{/if}
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

	/* hatched rows mark the matrix as read-only */
	td.locked {
		background: repeating-linear-gradient(
			45deg,
			var(--color-primary-025),
			var(--color-primary-025) 2px,
			var(--color-primary-050) 2px,
			var(--color-primary-050) 4px
		);
	}

	input[type='checkbox'] {
		accent-color: var(--color-primary-700);
	}

	td.locked input[type='checkbox'] {
		accent-color: var(--color-gray-600);
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

	.user-cell {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.user-name {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.col-name {
		min-width: 13.75rem;
		width: 13.75rem;
	}

	.col-role {
		min-width: 9rem;
	}

	.col-grant {
		min-width: 7.5rem;
		width: 7.5rem;
	}

	.col-actions {
		min-width: 3.5rem;
		text-align: center;
	}

	.remove-button,
	.add-button {
		align-items: center;
		display: inline-flex;
		gap: 0.25rem;
	}

	.add-row td {
		border-right: none;
	}

	.add-button {
		color: var(--color-primary-700);
	}
</style>
