<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/flowbite/chevron-down-outline';
	import ChevronRightIcon from '~icons/flowbite/chevron-right-outline';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import saveGrantInheritance from '$lib/client/saveGrantInheritance';
	import saveGrants from '$lib/client/saveGrants';
	import BadgeDropdown, { type BadgeDropdownValue } from '$lib/components/BadgeDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		displayName,
		type Grant,
		type GrantKind,
		type GrantSet,
		grantSetForRole,
		grantSetForSubjectOn,
		type MemberRole,
		memberRoleMatchingGrantSet,
		memberRoles,
		predicates,
		type User
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		grants: Readonly<Array<Grant>>;
		inheritedGrants: Readonly<Array<Grant>>;
		inheritedUsers: Readonly<Array<User>>;
		oninvite?: () => void;
		scope: Container<AnyPayload>;
		users: Readonly<Array<User>>;
	}

	let {
		container,
		editable = false,
		grants,
		inheritedGrants,
		inheritedUsers,
		oninvite,
		scope,
		users
	}: Props = $props();

	// One checkbox may cover kinds on both targets: reading spans the object
	// and its subordinate objects, while the remaining columns address exactly
	// one target each. Managing users of subordinate objects has no column of
	// its own and only travels with the role mapping.
	interface KindColumn {
		key: string;
		label: string;
		self: GrantKind[];
		subordinates: GrantKind[];
	}

	const kindColumns: KindColumn[] = $derived([
		{ key: 'read', label: $_('permission.read'), self: ['read'], subordinates: ['read'] },
		{
			key: 'update-subordinates',
			label: $_('permission_matrix.edit_objects'),
			self: [],
			subordinates: ['update']
		},
		{
			key: 'create-subordinates',
			label: $_('permission_matrix.create_objects'),
			self: [],
			subordinates: ['create']
		},
		{
			key: 'delete-subordinates',
			label: $_('permission_matrix.delete_objects'),
			self: [],
			subordinates: ['delete']
		},
		{
			key: 'update-self',
			label: $_('permission_matrix.edit_this', {
				values: { type: $_(container.payload.type) }
			}),
			self: ['update'],
			subordinates: []
		},
		{
			key: 'manage-users',
			label: $_('permission_matrix.manage_permissions'),
			self: ['manage-users'],
			subordinates: []
		}
	]);

	const selectableRoles = [
		memberRoles.enum.administrator,
		memberRoles.enum.head,
		memberRoles.enum.collaborator,
		memberRoles.enum.observer
	];

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

	const storedInherits = $derived(
		'inheritsGrants' in container.payload ? container.payload.inheritsGrants : true
	);

	let inheritsOverride = $state<boolean | undefined>();

	$effect(() => {
		if (inheritsOverride === storedInherits) {
			inheritsOverride = undefined;
		}
	});

	const inherits = $derived(inheritsOverride ?? storedInherits);

	let inheritedExpanded = $state(true);
	let ownExpanded = $state(true);

	const creators = $derived(
		container.user
			.filter(({ predicate }) => predicate === predicates.enum['is-creator-of'])
			.map(({ subject }) => subject)
	);

	const inheritedRows = $derived(
		inheritedUsers
			.map((user) => ({ user, set: grantSetForSubjectOn(inheritedGrants, scope.guid, user.guid) }))
			.filter(({ set }) => set.self.length > 0 || set.subordinates.length > 0)
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

	function hasColumn(set: GrantSet, column: KindColumn) {
		return (
			column.self.every((kind) => set.self.includes(kind)) &&
			column.subordinates.every((kind) => set.subordinates.includes(kind))
		);
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

	async function toggleColumn(user: User, column: KindColumn, checked: boolean) {
		const current = visibleSetFor(user);
		const adjust = (kinds: GrantKind[], columnKinds: GrantKind[]) =>
			checked
				? [...kinds.filter((kind) => !columnKinds.includes(kind)), ...columnKinds]
				: kinds.filter((kind) => !columnKinds.includes(kind));
		await save(user, {
			self: adjust(current.self, column.self),
			subordinates: adjust(current.subordinates, column.subordinates)
		});
	}

	async function removeSubject(user: User) {
		await save(user, { self: [], subordinates: [] });
	}

	async function toggleInheritance(checked: boolean) {
		inheritsOverride = checked;

		const response = await saveGrantInheritance(container, checked);

		if (!response.ok) {
			inheritsOverride = undefined;
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
				<th class="col-role">
					<span class="header-content">
						<span class="header-label">{$_('user.role')}</span>
					</span>
				</th>
				{#each kindColumns as column (column.key)}
					<th class="col-grant">
						<span class="header-content">
							<span class="header-label">{column.label}</span>
						</span>
					</th>
				{/each}
				<th class="col-actions"></th>
			</tr>
		</thead>
		<tbody>
			<tr class="section-row" class:inactive={!inherits}>
				<td colspan={3 + kindColumns.length}>
					<span class="section-header">
						<button
							aria-expanded={inheritedExpanded}
							class="quiet section-toggle"
							type="button"
							onclick={() => (inheritedExpanded = !inheritedExpanded)}
						>
							{#if inheritedExpanded}<ChevronDownIcon />{:else}<ChevronRightIcon />{/if}
							<span class="section-title">
								{$_('permission_matrix.inherited_from', {
									values: { name: 'name' in scope.payload ? scope.payload.name : '' }
								})}
							</span>
						</button>
						<label class="inherit-toggle">
							<span>{$_('permission_matrix.inherit_toggle')}</span>
							<input
								checked={inherits}
								class="toggle"
								disabled={!editable}
								type="checkbox"
								onchange={(event) => toggleInheritance(event.currentTarget.checked)}
							/>
						</label>
					</span>
				</td>
			</tr>
			{#if inheritedExpanded}
				{#each inheritedRows as { set, user } (user.guid)}
					<tr class:inactive={!inherits}>
						<td class="col-name" class:locked={inherits}>
							<span class="user-cell">
								<span class="user-name">{displayName(user)}</span>
							</span>
						</td>
						<td class="col-role" class:locked={inherits}>
							<BadgeDropdown
								allowEmpty={false}
								value={memberRoleMatchingGrantSet(set) ?? undefined}
								options={roleOptions}
								editable={false}
								emptyLabel={$_('role.custom')}
							/>
						</td>
						{#each kindColumns as column (column.key)}
							<td class="col-grant" class:locked={inherits}>
								<input
									type="checkbox"
									aria-label={column.label}
									checked={hasColumn(set, column)}
									disabled
								/>
							</td>
						{/each}
						<td class="col-actions" class:locked={inherits}></td>
					</tr>
				{/each}
			{/if}
			<tr class="section-row">
				<td colspan={3 + kindColumns.length}>
					<span class="section-header">
						<button
							aria-expanded={ownExpanded}
							class="quiet section-toggle"
							type="button"
							onclick={() => (ownExpanded = !ownExpanded)}
						>
							{#if ownExpanded}<ChevronDownIcon />{:else}<ChevronRightIcon />{/if}
							<span class="section-title">
								{'title' in container.payload ? container.payload.title : ''}
							</span>
						</button>
					</span>
				</td>
			</tr>
			{#if ownExpanded}
				{#each users as user (user.guid)}
					{@const set = visibleSetFor(user)}
					<tr>
						<td class="col-name">
							<span class="user-cell">
								<span class="user-name">{displayName(user)}</span>
								{#if creators.includes(user.guid)}
									<span class="badge badge--yellow">{$_('role.author')}</span>
								{/if}
							</span>
						</td>
						<td class="col-role">
							<BadgeDropdown
								allowEmpty={false}
								value={memberRoleMatchingGrantSet(set) ?? undefined}
								options={roleOptions}
								editable={editable && !inherits}
								emptyLabel={$_('role.custom')}
								onchange={(value) => changeRole(user, value)}
							/>
						</td>
						{#each kindColumns as column (column.key)}
							<td class="col-grant">
								<input
									type="checkbox"
									aria-label={column.label}
									checked={hasColumn(set, column)}
									disabled={!editable || inherits}
									onchange={(event) => toggleColumn(user, column, event.currentTarget.checked)}
								/>
							</td>
						{/each}
						<td class="col-actions">
							{#if editable && !inherits}
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
							<button
								class="quiet add-button"
								disabled={!editable || inherits}
								type="button"
								onclick={oninvite}
							>
								<PlusIcon />
								<span>{$_('add_item')}</span>
							</button>
						</td>
					</tr>
				{/if}
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

	/* the hatched blue rows mark the inherited matrix as read-only */
	td.locked {
		background: repeating-linear-gradient(
			45deg,
			var(--color-primary-025),
			var(--color-primary-025) 2px,
			var(--color-primary-050) 2px,
			var(--color-primary-050) 4px
		);
	}

	/* the inherited matrix no longer applies once inheritance is disabled */
	tr.inactive td {
		opacity: 0.5;
	}

	tr.inactive .user-name,
	tr.inactive .section-title {
		text-decoration: line-through;
	}

	tr.section-row td {
		border-right: none;
	}

	.section-header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.section-toggle {
		align-items: center;
		color: var(--color-gray-800);
		display: inline-flex;
		font-weight: 500;
		gap: 0.375rem;
	}

	.inherit-toggle {
		align-items: center;
		display: inline-flex;
		font-weight: 500;
		gap: 0.5rem;
	}

	input[type='checkbox']:not(.toggle) {
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

	.add-button {
		color: var(--color-primary-700);
	}

	.add-button:disabled {
		color: var(--color-gray-400);
		cursor: not-allowed;
	}
</style>
