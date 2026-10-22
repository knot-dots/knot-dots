<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/flowbite/chevron-down-outline';
	import ChevronRightIcon from '~icons/flowbite/chevron-right-outline';
	import InfoIcon from '~icons/flowbite/info-circle-outline';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import RoleIcon from '~icons/knotdots/arrow-circle-down-outline';
	import tooltip from '$lib/attachments/tooltip';
	import saveGrantInheritance from '$lib/client/saveGrantInheritance';
	import saveGrants from '$lib/client/saveGrants';
	import BadgeDropdown, { type BadgeDropdownValue } from '$lib/components/BadgeDropdown.svelte';
	import PermissionCheckbox from '$lib/components/PermissionCheckbox.svelte';
	import TeamChip from '$lib/components/TeamChip.svelte';
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
		type InheritedMatrixSection,
		type MemberRole,
		memberRoleMatchingGrantSet,
		memberRoles,
		predicates,
		type TeamWithMembers,
		type User
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		admins: Readonly<Array<User>>;
		adminTeams?: ReadonlyArray<TeamWithMembers>;
		container: Container<AnyPayload>;
		editable?: boolean;
		grants: Readonly<Array<Grant>>;
		inheritedSections: ReadonlyArray<InheritedMatrixSection>;
		// may the user edit at all (as opposed to editable: in edit mode now)
		mayEdit?: boolean;
		mayManageOrganizationUsers?: boolean;
		oninvite?: () => void;
		teams: ReadonlyArray<TeamWithMembers>;
		users: Readonly<Array<User>>;
	}

	let {
		admins,
		adminTeams = [],
		container,
		editable = false,
		grants,
		inheritedSections,
		mayEdit = editable,
		mayManageOrganizationUsers = false,
		oninvite,
		teams,
		users
	}: Props = $props();

	// a row names a user or a team; grants and overrides are keyed by the
	// subject guid either way
	type Subject =
		| { guid: string; team?: undefined; user: User }
		| { guid: string; team: TeamWithMembers; user?: undefined };
	const userSubject = (user: User): Subject => ({ guid: user.guid, user });
	const teamSubject = (team: TeamWithMembers): Subject => ({ guid: team.container.guid, team });
	// the roster of a team is its own user management, open to those who
	// manage the users there
	const manageHrefFor = (team: TeamWithMembers) =>
		$ability.can('manage-users', team.container)
			? `/${team.container.guid}/user-management`
			: undefined;

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
	const viewOnly = $derived(!mayEdit);

	// expanded states follow the active sections until toggled by hand
	let adminsExpanded = $state(true);
	let ownExpandedOverride = $state<boolean | undefined>();
	let sectionExpandedOverrides = new SvelteMap<string, boolean>();
	const ownExpanded = $derived(ownExpandedOverride ?? !inherits);
	const sectionExpanded = (section: (typeof inheritedSections)[number]) =>
		sectionExpandedOverrides.get(section.scope.guid) ?? section.active;

	const creators = $derived(
		container.user
			.filter(({ predicate }) => predicate === predicates.enum['is-creator-of'])
			.map(({ subject }) => subject)
	);

	function sectionRows(section: (typeof inheritedSections)[number]) {
		return [...section.users.map(userSubject), ...section.teams.map(teamSubject)]
			.map((subject) => ({
				subject,
				set: grantSetForSubjectOn(section.grants, section.scope.guid, subject.guid)
			}))
			.filter(({ set }) => set.self.length > 0 || set.subordinates.length > 0);
	}

	function titleOf(c: Container<AnyPayload>) {
		return 'name' in c.payload ? c.payload.name : 'title' in c.payload ? c.payload.title : '';
	}

	let setOverrides = new SvelteMap<string, GrantSet>();

	// the container's own rows: every user with a role on it and the teams
	// holding rows on it (or about to, while an assignment is in flight)
	const ownRows = $derived([
		...users.map(userSubject),
		...teams
			.filter(
				({ container: team }) =>
					setOverrides.has(team.guid) ||
					grants.some((g) => g.object === container.guid && g.subject === team.guid)
			)
			.map(teamSubject)
	]);

	function storedSetFor(subject: string) {
		return grantSetForSubjectOn(grants, container.guid, subject);
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
			const known =
				users.some((u) => u.guid === guid) || teams.some((t) => t.container.guid === guid);
			if (!known || sameSet(storedSetFor(guid), set)) {
				setOverrides.delete(guid);
			}
		}
	});

	function visibleSetFor(subject: string): GrantSet {
		return setOverrides.get(subject) ?? storedSetFor(subject);
	}

	function isSelectableRole(value: BadgeDropdownValue): value is MemberRole {
		return typeof value === 'string' && (selectableRoles as string[]).includes(value);
	}

	async function save(subject: string, set: GrantSet) {
		const hadPrevious = setOverrides.has(subject);
		const previous = setOverrides.get(subject);
		setOverrides.set(subject, set);

		const response = await saveGrants(container, { subject, ...set });

		if (!response.ok) {
			if (hadPrevious && previous) setOverrides.set(subject, previous);
			else setOverrides.delete(subject);
			console.log(await response.json());
			return;
		}

		await invalidateAll();
	}

	async function changeRole(subject: string, value: BadgeDropdownValue) {
		if (!isSelectableRole(value)) {
			return;
		}
		await save(subject, grantSetForRole(value));
	}

	async function toggleKind(
		subject: string,
		target: GrantTarget,
		kind: GrantKind,
		checked: boolean
	) {
		const current = visibleSetFor(subject);
		await save(subject, {
			...current,
			[target]: checked
				? [...current[target].filter((k) => k !== kind), kind]
				: current[target].filter((k) => k !== kind)
		});
	}

	async function removeSubject(subject: string) {
		await save(subject, { self: [], subordinates: [] });
	}

	async function toggleIndividualRights(checked: boolean) {
		inheritsOverride = !checked;
		ownExpandedOverride = undefined;
		sectionExpandedOverrides.clear();

		const response = await saveGrantInheritance(container, !checked);

		if (!response.ok) {
			inheritsOverride = undefined;
			console.log(await response.json());
			return;
		}

		await invalidateAll();
	}

	function cellLabel(kind: GrantKind, groupLabel: string, checked: boolean) {
		return `${$_(`permission.${kind}`)} (${$_(`permission_matrix.${groupLabel}`)}): ${$_(
			checked ? 'permission_matrix.granted' : 'permission_matrix.not_granted'
		)}`;
	}
</script>

{#snippet subjectName(subject: Subject, author: boolean)}
	<span class="user-cell">
		{#if subject.team}
			<TeamChip manageHref={manageHrefFor(subject.team)} team={subject.team} />
		{:else}
			<span class="user-name">{displayName(subject.user)}</span>
		{/if}
		{#if author}
			<span class="badge badge--large badge--yellow">{$_('role.author')}</span>
		{/if}
	</span>
{/snippet}

<div class="table-wrapper wide">
	<table>
		<thead>
			<tr>
				<th class="col-name" rowspan="2">
					<span class="header-content">
						{#if viewOnly}
							<button
								aria-label={$_('permission_matrix.view_only')}
								class="action-button action-button--alternate"
								type="button"
								{@attach tooltip($_('permission_matrix.view_only'), { describe: true })}
							>
								<InfoIcon />
							</button>
						{/if}
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
				<th class="col-actions"></th>
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
				<th class="col-actions"></th>
			</tr>
		</thead>
		<tbody>
			<!-- administrators of the surrounding areas always hold every kind -->
			<tr class="section-row section-row--admins">
				<td colspan={columnCount + 1}>
					<span class="section-header">
						<span class="section-start">
							<button
								aria-expanded={adminsExpanded}
								class="section-toggle"
								type="button"
								onclick={() => (adminsExpanded = !adminsExpanded)}
							>
								{#if adminsExpanded}<ChevronDownIcon />{:else}<ChevronRightIcon />{/if}
								<span class="section-title">{$_('permission_matrix.admins')}</span>
							</button>
							<span class="badge section-badge">{$_('permission_matrix.always_all_rights')}</span>
						</span>
						{#if mayManageOrganizationUsers}
							<a class="admins-link" href={`/${container.organization}/user-management`}>
								{$_('permission_matrix.manage_in_organization')} →
							</a>
						{/if}
					</span>
				</td>
			</tr>
			{#if adminsExpanded}
				{#each [...admins.map(userSubject), ...adminTeams.map(teamSubject)] as subject (subject.guid)}
					<tr>
						<td class="col-name" class:locked={!viewOnly}>
							{@render subjectName(subject, false)}
						</td>
						<td class="col-role" class:locked={!viewOnly}>
							<BadgeDropdown
								allowEmpty={false}
								value={memberRoles.enum.administrator}
								options={roleOptions}
								editable={false}
								emptyLabel={$_('role.custom')}
							/>
						</td>
						{#each columnGroups as group (group.target)}
							{#each group.kinds as kind (kind)}
								<td
									class="col-grant"
									class:locked={!viewOnly}
									class:col-group-start={kind === group.kinds[0]}
								>
									<PermissionCheckbox
										ariaLabel={cellLabel(kind, group.label, true)}
										checked
										state="readonly"
										tooltip={viewOnly
											? $_('permission_matrix.tooltip_readonly')
											: $_('permission_matrix.always_all_rights')}
									/>
								</td>
							{/each}
						{/each}
						<td class="col-actions" class:locked={!viewOnly}></td>
					</tr>
				{/each}
			{/if}

			<!-- the container's own matrix -->
			<tr
				class="section-row section-row--individual {inherits ? '' : 'system-success'}"
				class:active={!inherits}
			>
				<td colspan={columnCount + 1}>
					<span class="section-header">
						<span class="section-start">
							<button
								aria-expanded={ownExpanded}
								class="section-toggle"
								type="button"
								onclick={() => (ownExpandedOverride = !ownExpanded)}
							>
								{#if ownExpanded}<ChevronDownIcon />{:else}<ChevronRightIcon />{/if}
								<span class="section-title">
									{$_('permission_matrix.individual_rights_for', {
										values: { name: titleOf(container) }
									})}
								</span>
							</button>
							<span class="badge section-badge">
								{$_(inherits ? 'permission_matrix.inactive' : 'permission_matrix.active')}
							</span>
						</span>
						{#if editable}
							<label class="inherit-toggle">
								<span>{$_('permission_matrix.individual_rights')}</span>
								<input
									checked={!inherits}
									class="toggle"
									type="checkbox"
									onchange={(event) => toggleIndividualRights(event.currentTarget.checked)}
								/>
							</label>
						{/if}
					</span>
				</td>
			</tr>
			{#if ownExpanded}
				{#each ownRows as subject (subject.guid)}
					{@const set = visibleSetFor(subject.guid)}
					{@const cellState = inherits ? 'inactive' : editable ? 'editable' : 'readonly'}
					<tr>
						<td class="col-name" class:locked={!viewOnly && inherits}>
							{@render subjectName(subject, creators.includes(subject.guid))}
						</td>
						<td class="col-role" class:locked={!viewOnly && inherits}>
							<BadgeDropdown
								allowEmpty={false}
								value={memberRoleMatchingGrantSet(set) ?? undefined}
								options={roleOptions}
								editable={editable && !inherits}
								emptyLabel={$_('role.custom')}
								onchange={(value) => changeRole(subject.guid, value)}
							/>
						</td>
						{#each columnGroups as group (group.target)}
							{#each group.kinds as kind (kind)}
								{@const checked = set[group.target].includes(kind)}
								<td
									class="col-grant"
									class:locked={!viewOnly && inherits}
									class:col-group-start={kind === group.kinds[0]}
								>
									<PermissionCheckbox
										ariaLabel={cellState === 'editable'
											? `${$_(`permission.${kind}`)} (${$_(`permission_matrix.${group.label}`)})`
											: cellLabel(kind, group.label, checked)}
										{checked}
										state={cellState}
										tooltip={cellState === 'inactive'
											? $_('permission_matrix.tooltip_dormant_own')
											: cellState === 'readonly' && viewOnly
												? $_('permission_matrix.tooltip_readonly')
												: undefined}
										onchange={(value) => toggleKind(subject.guid, group.target, kind, value)}
									/>
								</td>
							{/each}
						{/each}
						<td class="col-actions" class:locked={!viewOnly && inherits}>
							{#if editable && !inherits}
								<button
									aria-label={$_('user.remove')}
									class="action-button"
									type="button"
									onclick={() => removeSubject(subject.guid)}
								>
									<TrashBinIcon />
								</button>
							{/if}
						</td>
					</tr>
				{/each}
				{#if oninvite && editable && !inherits}
					<tr class="add-row">
						<td colspan={columnCount + 1}>
							<button
								class="button-alternate button-xs system-primary"
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

			<!-- the governing matrices, one section each; they apply beside the
			     container's own rows, a dormant area section once it inherits -->
			{#each inheritedSections as section (section.scope.guid)}
				{@const expanded = sectionExpanded(section)}
				<tr
					class="section-row section-row--inherited {section.active ? 'system-success' : ''}"
					class:active={section.active}
				>
					<td colspan={columnCount + 1}>
						<span class="section-header">
							<span class="section-start">
								<button
									aria-expanded={expanded}
									class="section-toggle"
									type="button"
									onclick={() => sectionExpandedOverrides.set(section.scope.guid, !expanded)}
								>
									{#if expanded}<ChevronDownIcon />{:else}<ChevronRightIcon />{/if}
									<span class="section-title">
										{$_('permission_matrix.inherited_from', {
											values: { name: section.scope.title }
										})}
									</span>
								</button>
								<span class="badge section-badge">
									{$_(section.active ? 'permission_matrix.active' : 'permission_matrix.inactive')}
								</span>
							</span>
						</span>
					</td>
				</tr>
				{#if expanded}
					{#each sectionRows(section) as { set, subject } (subject.guid)}
						{@const cellState = section.active ? 'readonly' : 'inactive'}
						<tr>
							<td class="col-name" class:locked={!viewOnly}>
								{@render subjectName(subject, false)}
							</td>
							<td class="col-role" class:locked={!viewOnly}>
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
									{@const checked = set[group.target].includes(kind)}
									<td
										class="col-grant"
										class:locked={!viewOnly}
										class:col-group-start={kind === group.kinds[0]}
									>
										<PermissionCheckbox
											ariaLabel={cellLabel(kind, group.label, checked)}
											{checked}
											state={cellState}
											tooltip={cellState === 'inactive'
												? $_('permission_matrix.tooltip_dormant')
												: viewOnly
													? $_('permission_matrix.tooltip_readonly')
													: $_('permission_matrix.tooltip_inherited', {
															values: { name: section.scope.title }
														})}
										/>
									</td>
								{/each}
							{/each}
							<td class="col-actions" class:locked={!viewOnly}></td>
						</tr>
					{/each}
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
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
		border-left: 1px solid var(--color-border-subtle);
		font-weight: 500;
		height: 2.5rem;
		text-align: left;
	}

	thead tr:nth-child(2) th {
		top: 2.5rem;
	}

	th,
	td {
		border-bottom: 1px solid var(--color-border-subtle);
		border-right: 1px solid var(--color-border-subtle);
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
		border-left: 1px solid var(--color-border-subtle);
	}

	/* the empty actions header reads as part of the preceding cell */
	thead th:has(+ .col-actions) {
		border-right: none;
	}

	th {
		color: var(--color-text-default);
		font-weight: 400;
		height: 2.5rem;
	}

	td {
		color: var(--color-text-strong);
		font-weight: 500;
		height: 3.125rem;
		padding: 0.625rem 0.5rem;
	}

	/* the hatched cells mark locked rows; the pattern of the Figma component
	   (#fff5f5/#ffebeb), overlaid at 75% like in the design */
	td.locked {
		background: repeating-linear-gradient(
			45deg,
			rgba(255, 245, 245, 0.75),
			rgba(255, 245, 245, 0.75) 2px,
			rgba(255, 235, 235, 0.75) 2px,
			rgba(255, 235, 235, 0.75) 4px
		);
		cursor: not-allowed;
	}

	tr.section-row td {
		border-left: none;
		border-right: none;
		height: 3rem;
		padding: 0.75rem 0.5rem;
	}

	tr.add-row td {
		border: none;
	}

	/* the group heads take their colors from the system mode of the row:
	   .system-success while the group is active, the base mode otherwise */
	tr.section-row--individual td,
	tr.section-row--inherited td {
		background-color: var(--color-surface-accent-container);
		border-bottom: 1px solid var(--color-border-accent-muted);
		border-top: 1px solid var(--color-border-accent-muted);
	}

	tr.section-row--individual .section-toggle,
	tr.section-row--inherited .section-toggle {
		color: var(--color-text-accent-default);
	}

	tr.section-row--admins td {
		background-color: var(--color-surface-container-raised);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	tr.section-row--admins .section-toggle {
		color: var(--color-text-strong);
		font-weight: 600;
	}

	tr.section-row--admins .section-toggle :global(svg) {
		color: var(--color-icon-strong);
	}

	.section-header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.section-start {
		align-items: center;
		display: inline-flex;
		gap: 0.375rem;
	}

	.section-badge {
		--badge-background-color: var(--color-background-accent-subtle);
		--badge-color: var(--color-text-accent-default);
	}

	.section-toggle {
		align-items: center;
		background: none;
		border: none;
		color: var(--color-text-default);
		display: inline-flex;
		font-weight: 500;
		gap: 0.375rem;
		padding: 0;
	}

	.section-toggle :global(svg) {
		color: var(--color-icon-accent-default);
		height: 1rem;
		width: 1rem;
	}

	.admins-link {
		background-color: var(--color-surface-container-raised);
		color: var(--color-text-link);
		padding-left: 0.5rem;
		position: sticky;
		right: 0.5rem;
	}

	.inherit-toggle {
		align-items: center;
		background-color: var(--color-surface-accent-container);
		color: var(--color-text-accent-strong);
		display: inline-flex;
		font-weight: 500;
		gap: 0.5rem;
		padding-left: 0.5rem;
		position: sticky;
		right: 0.5rem;
	}

	.inherit-toggle .toggle {
		--height: 1.2rem;
		--padding: 0.15rem;
		--width: 2.7rem;
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

	.header-content .action-button {
		height: 1.75rem;
		padding: 0.375rem;
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
</style>
