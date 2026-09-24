<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/flowbite/chevron-down-outline';
	import ChevronRightIcon from '~icons/flowbite/chevron-right-outline';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import RoleIcon from '~icons/knotdots/arrow-circle-down-outline';
	import saveGrantInheritance from '$lib/client/saveGrantInheritance';
	import saveGrants from '$lib/client/saveGrants';
	import BadgeDropdown, { type BadgeDropdownValue } from '$lib/components/BadgeDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		displayName,
		type Grant,
		type GrantKind,
		grantKindsByTarget,
		type GrantSet,
		type GrantTarget,
		grantTargets,
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

	// every stored grant is editable individually: the rights on the object
	// itself and the rights on subordinate objects form separate column groups,
	// just like in the matrix of an organization
	const columnGroups = [
		{ kinds: grantKindsByTarget.self, label: 'this_object', target: grantTargets.enum.self },
		{
			kinds: grantKindsByTarget.subordinates,
			label: 'subordinate_objects',
			target: grantTargets.enum.subordinates
		}
	];
	const columnCount = columnGroups.reduce((count, { kinds }) => count + kinds.length, 3);

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

	const storedInherits = $derived(!container.own_matrix);

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

	async function toggleKind(user: User, target: GrantTarget, kind: GrantKind, checked: boolean) {
		const current = visibleSetFor(user);
		await save(user, {
			...current,
			[target]: checked
				? [...current[target].filter((k) => k !== kind), kind]
				: current[target].filter((k) => k !== kind)
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
				<th class="col-name" rowspan="2">
					<span class="header-content">
						<UserIcon />
						<span class="header-label">{$_('user.display_name')}</span>
					</span>
				</th>
				<th class="col-role" rowspan="2">
					<span class="header-content">
						<RoleIcon />
						<span class="header-label">{$_('user.role')}</span>
					</span>
				</th>
				{#each columnGroups as group (group.target)}
					<th class="col-group" colspan={group.kinds.length} scope="colgroup">
						{$_(`permission_matrix.${group.label}`)}
					</th>
				{/each}
				<th class="col-actions" rowspan="2"></th>
			</tr>
			<tr>
				{#each columnGroups as group (group.target)}
					{#each group.kinds as kind (kind)}
						<th class="col-grant" class:col-group-start={kind === group.kinds[0]}>
							<span class="header-content">
								<span class="header-label">{$_(`permission.${kind}`)}</span>
							</span>
						</th>
					{/each}
				{/each}
			</tr>
		</thead>
		<tbody>
			<tr class="section-row section-row--inherited" class:inactive={!inherits}>
				<td colspan={columnCount + 1}>
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
									values: {
										name:
											'name' in scope.payload
												? scope.payload.name
												: 'title' in scope.payload
													? scope.payload.title
													: ''
									}
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
						<td class="col-name locked">
							<span class="user-cell">
								<span class="user-name">{displayName(user)}</span>
							</span>
						</td>
						<td class="col-role locked">
							<BadgeDropdown
								allowEmpty={false}
								value={memberRoleMatchingGrantSet(set) ?? undefined}
								options={roleOptions}
								editable={false}
								emptyLabel={$_('role.custom')}
							/>
						</td>
						{#each columnGroups as group (group.target)}
							{#each group.kinds as kind (kind)}
								<td class="col-grant locked" class:col-group-start={kind === group.kinds[0]}>
									<input
										type="checkbox"
										aria-label={`${$_(`permission.${kind}`)} (${$_(`permission_matrix.${group.label}`)})`}
										checked={set[group.target].includes(kind)}
										disabled
									/>
								</td>
							{/each}
						{/each}
						<td class="col-actions locked"></td>
					</tr>
				{/each}
			{/if}
			<tr class="section-row section-row--own">
				<td colspan={columnCount + 1}>
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
									<span class="badge badge--large badge--yellow">{$_('role.author')}</span>
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
						{#each columnGroups as group (group.target)}
							{#each group.kinds as kind (kind)}
								<td class="col-grant" class:col-group-start={kind === group.kinds[0]}>
									<input
										type="checkbox"
										aria-label={`${$_(`permission.${kind}`)} (${$_(`permission_matrix.${group.label}`)})`}
										checked={set[group.target].includes(kind)}
										disabled={!editable || inherits}
										onchange={(event) =>
											toggleKind(user, group.target, kind, event.currentTarget.checked)}
									/>
								</td>
							{/each}
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
						<td colspan={columnCount + 1}>
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
		border-radius: 4px;
		font-size: 0.875rem;
		min-width: 100%;
		width: max-content;
	}

	thead th {
		background-color: white;
		position: sticky;
		z-index: 1;
	}

	/* the matrix does not use the global row highlighting */
	tbody tr,
	tbody tr:hover,
	tbody tr:has(input[type='checkbox']:checked) {
		background-color: white;
	}

	thead tr:first-child th {
		top: 0;
	}

	th.col-group {
		border-left: 1px solid var(--color-gray-100);
		font-weight: 500;
		height: 2.5rem;
		text-align: left;
	}

	thead tr:nth-child(2) th {
		top: 2.5rem;
	}

	th,
	td {
		border-bottom: 1px solid var(--color-gray-100);
		border-right: 1px solid var(--color-gray-100);
		padding: 0.5rem;
		white-space: nowrap;
	}

	th:last-child,
	td:last-child {
		border-right: none;
	}

	/* stronger separators mark the start of each column group */
	td.col-role,
	th.col-role,
	.col-group-start {
		border-left: 1px solid var(--color-gray-100);
	}

	th {
		color: var(--color-gray-600);
		font-weight: 400;
		height: 2.5rem;
	}

	td {
		color: var(--color-gray-800);
		font-weight: 500;
		height: 3.125rem;
		padding: 0.625rem 0.5rem;
	}

	/* the hatched rows mark the inherited matrix as read-only;
	   pattern and colors as specified in the Figma component */
	td.locked {
		background: repeating-linear-gradient(45deg, #fff5f5, #fff5f5 2px, #ffebeb 2px, #ffebeb 4px);
		cursor: not-allowed;
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
		border-left: none;
		border-right: none;
		padding: 0.75rem 0.5rem;
	}

	tr.add-row td {
		border: none;
	}

	tr.section-row--inherited td {
		background-color: var(--color-green-025);
		border-bottom: 1px solid var(--color-green-050);
		border-top: 1px solid var(--color-green-050);
		height: 2.5rem;
	}

	tr.section-row--inherited .section-toggle {
		color: var(--color-green-700);
	}

	tr.section-row--inherited .inherit-toggle {
		color: var(--color-green-900);
	}

	tr.section-row--inherited.inactive td {
		background-color: var(--color-gray-025);
		border-bottom: 1px solid var(--color-gray-050);
		border-top: 1px solid var(--color-gray-050);
		opacity: 1;
	}

	tr.section-row--inherited.inactive .section-toggle {
		color: var(--color-gray-700);
	}

	tr.section-row--inherited.inactive .inherit-toggle {
		color: var(--color-gray-900);
	}

	tr.section-row--own td {
		border-bottom: 1px solid var(--color-gray-050);
		border-top: 1px solid var(--color-gray-050);
		height: 3rem;
		padding: 0.5rem;
	}

	.section-header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.section-toggle {
		align-items: center;
		background: none;
		border: none;
		color: var(--color-gray-700);
		display: inline-flex;
		font-weight: 500;
		gap: 0.375rem;
		padding: 0;
	}

	.section-toggle :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.inherit-toggle {
		align-items: center;
		display: inline-flex;
		font-weight: 500;
		gap: 0.5rem;
	}

	.inherit-toggle .toggle {
		--height: 1.2rem;
		--padding: 0.15rem;
		--width: 2.7rem;

		background-color: var(--color-gray-300);
	}

	.inherit-toggle .toggle:checked {
		background-color: var(--color-green-700);
	}

	.inherit-toggle .toggle:disabled {
		background-color: var(--color-gray-300);
	}

	.inherit-toggle .toggle:checked:disabled {
		background-color: var(--color-green-700);
	}

	input[type='checkbox']:not(.toggle) {
		appearance: none;
		background-color: var(--color-gray-025);
		border: 1px solid var(--color-gray-200);
		border-radius: 4px;
		height: 1rem;
		margin: 0;
		width: 1rem;
	}

	input[type='checkbox']:not(.toggle):checked {
		background-color: var(--color-primary-700);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2 6.5L4.5 9L10 3.5' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-position: center;
		background-repeat: no-repeat;
		background-size: 0.625rem;
		border-color: var(--color-primary-700);
	}

	td.locked input[type='checkbox'] {
		cursor: not-allowed;
	}

	tr.inactive input[type='checkbox']:not(.toggle):checked {
		background-color: var(--color-gray-400);
		border-color: var(--color-gray-400);
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
		min-width: 9.125rem;
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

	.remove-button {
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-700);
		height: 2rem;
		padding: 0 0.5rem;
	}

	.remove-button :global(svg),
	.add-button :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.add-button {
		background: none;
		border: none;
		border-radius: 4px;
		color: var(--color-primary-700);
		font-weight: 500;
		min-height: 1.75rem;
		padding: 0.375rem 0.5rem;
	}

	.add-button:disabled {
		color: var(--color-gray-300);
		cursor: not-allowed;
	}
</style>
