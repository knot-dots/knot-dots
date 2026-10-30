<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import CheckCircleIcon from '~icons/flowbite/check-circle-outline';
	import CheckIcon from '~icons/flowbite/check-outline';
	import EnvelopeIcon from '~icons/flowbite/envelope-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import saveGrants from '$lib/client/saveGrants';
	import saveUser from '$lib/client/saveUser';
	import BadgeDropdown, { type BadgeDropdownValue } from '$lib/components/BadgeDropdown.svelte';
	import PermissionCheckbox from '$lib/components/PermissionCheckbox.svelte';
	import SubjectCombobox, { type SubjectSuggestion } from '$lib/components/SubjectCombobox.svelte';
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
		type MemberRole,
		memberRoleMatchingGrantSet,
		memberRoles,
		type TeamWithMembers,
		type User
	} from '$lib/models';
	import { getToastContext } from '$lib/contexts/toast';
	import { ability, user } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		grants: Readonly<Array<Grant>>;
		oninvite?: () => void;
		teams: ReadonlyArray<TeamWithMembers>;
		users: Readonly<Array<User>>;
	}

	let { container, editable = false, grants, oninvite, teams, users }: Props = $props();

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
	// itself and the rights on subordinate objects form separate column groups
	const columnGroups = [
		{ kinds: grantKindsByTarget.self, label: 'this_object', target: grantTargets.enum.self },
		{
			kinds: grantKindsByTarget.subordinates,
			label: 'subordinate_objects',
			target: grantTargets.enum.subordinates
		}
	];

	const selectableRoles = [
		memberRoles.enum.administrator,
		memberRoles.enum.head,
		memberRoles.enum.collaborator,
		memberRoles.enum.observer
	];

	const roleColors: Record<MemberRole, string> = {
		administrator: 'red',
		head: 'yellow',
		collaborator: 'blue',
		observer: 'gray'
	};

	// whether the add row is searching for a subject
	let adding = $state(false);
	const roleOptions = $derived(
		selectableRoles.map((role) => ({
			label: $_(`role.${role}`),
			value: role,
			badgeColor: roleColors[role]
		}))
	);

	// one's own row is locked: nobody takes rights from themselves by accident
	const isSelf = (subject: Subject) => subject.user?.guid === $user.guid;
	const nameOf = (subject: Subject) =>
		subject.team ? subject.team.container.payload.name : displayName(subject.user);

	const toast = getToastContext();

	let setOverrides = new SvelteMap<string, GrantSet>();

	// every user with a role on the organization and the teams holding rows on
	// it (or about to, while an assignment is in flight)
	const rows = $derived([
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

	function reportFailure() {
		toast({ heading: $_('permission_matrix.error_saving'), status: 'error' });
	}

	async function save(subject: string, set: GrantSet) {
		const hadPrevious = setOverrides.has(subject);
		const previous = setOverrides.get(subject);
		setOverrides.set(subject, set);

		const response = await saveGrants(container, { subject, ...set });

		if (!response.ok) {
			if (hadPrevious && previous) setOverrides.set(subject, previous);
			else setOverrides.delete(subject);
			reportFailure();
			return false;
		}

		await invalidateAll();
		return true;
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
		const kinds = checked
			? [...current[target].filter((k) => k !== kind), kind]
			: current[target].filter((k) => k !== kind);
		await save(subject, { ...current, [target]: kinds });
	}

	// removing a row can be undone from the toast: the previous set is saved
	// again (for a user, that invites them into the container once more)
	async function removeSubject(subject: Subject) {
		const previous = visibleSetFor(subject.guid);
		if (await save(subject.guid, { self: [], subordinates: [] })) {
			toast({
				action: {
					label: $_('permission_matrix.undo'),
					onclick: () => save(subject.guid, previous)
				},
				heading: $_('permission_matrix.removed', { values: { name: nameOf(subject) } }),
				icon: CheckIcon,
				status: 'success'
			});
		}
	}

	// adding a row starts with the observer set; registered users who are no
	// member yet get invited into the container on the way
	async function addSubject(suggestion: SubjectSuggestion) {
		if (suggestion.kind === 'team') {
			await save(suggestion.guid, grantSetForRole(memberRoles.enum.observer));
			return;
		}
		const response = await saveUser({
			container,
			email: suggestion.email,
			role: memberRoles.enum.observer
		});
		if (!response.ok) {
			reportFailure();
			return;
		}
		await invalidateAll();
	}
</script>

<div class="table-wrapper">
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
						<th class="col-grant">
							<span class="header-content">
								<CheckCircleIcon />
								<span class="header-label">{$_(`permission.${kind}`)}</span>
							</span>
						</th>
					{/each}
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as subject (subject.guid)}
				{@const set = visibleSetFor(subject.guid)}
				{@const self = isSelf(subject)}
				{@const locked = !editable || self}
				<tr>
					<td class="col-name" class:locked>
						<span class="user-cell">
							{#if subject.team}
								<TeamChip manageHref={manageHrefFor(subject.team)} team={subject.team} />
							{:else}
								<span class="user-name">
									{self
										? `${displayName(subject.user)} ${$_('permission_matrix.you')}`
										: displayName(subject.user)}
								</span>
							{/if}
						</span>
					</td>
					<td class="col-role" class:locked>
						<BadgeDropdown
							allowEmpty={false}
							value={memberRoleMatchingGrantSet(set) ?? undefined}
							options={roleOptions}
							editable={editable && !self}
							emptyLabel={$_('role.custom')}
							onchange={(value) => changeRole(subject.guid, value)}
						/>
					</td>
					{#each columnGroups as group (group.target)}
						{#each group.kinds as kind (kind)}
							<td class="col-grant" class:locked>
								<PermissionCheckbox
									ariaLabel={`${$_(`permission.${kind}`)} (${$_(`permission_matrix.${group.label}`)})`}
									checked={set[group.target].includes(kind)}
									state={editable && !self ? 'editable' : 'readonly'}
									tooltip={editable && self ? $_('permission_matrix.tooltip_own_row') : undefined}
									onchange={(value) => toggleKind(subject.guid, group.target, kind, value)}
								/>
							</td>
						{/each}
					{/each}
					<td class="col-actions" class:locked>
						{#if editable && !self}
							<button
								aria-label={$_('user.remove')}
								class="action-button"
								type="button"
								onclick={() => removeSubject(subject)}
							>
								<TrashBinIcon />
							</button>
						{/if}
					</td>
				</tr>
			{:else}
				<tr class="empty-row">
					<td colspan={10}>{$_('permission_matrix.no_entries')}</td>
				</tr>
			{/each}
			{#if editable}
				{#if adding}
					<!-- the row being added: the search in the name cell, the rest empty -->
					<tr>
						<td class="col-name">
							<SubjectCombobox
								excluded={rows.map(({ guid }) => guid)}
								onselect={addSubject}
								organization={container.organization}
								{teams}
								bind:open={adding}
							/>
						</td>
						<td class="col-role">
							<BadgeDropdown
								allowEmpty={false}
								value={undefined}
								options={roleOptions}
								editable={false}
								emptyLabel={$_('empty')}
							/>
						</td>
						{#each columnGroups as group (group.target)}
							{#each group.kinds as kind (kind)}
								<td class="col-grant">
									<PermissionCheckbox
										ariaLabel={`${$_(`permission.${kind}`)} (${$_(`permission_matrix.${group.label}`)})`}
										checked={false}
										disabled
										state="editable"
									/>
								</td>
							{/each}
						{/each}
						<td class="col-actions"></td>
					</tr>
				{:else}
					<tr class="add-row">
						<td colspan={10}>
							<span class="add-controls">
								<SubjectCombobox
									excluded={rows.map(({ guid }) => guid)}
									onselect={addSubject}
									organization={container.organization}
									{teams}
									bind:open={adding}
								/>
								{#if oninvite}
									<button class="button-alternate button-xs" type="button" onclick={oninvite}>
										<EnvelopeIcon />
										<span>{$_('invite.heading')}</span>
									</button>
								{/if}
							</span>
						</td>
					</tr>
				{/if}
			{/if}
		</tbody>
	</table>
</div>

<style>
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
		font-weight: 600;
		height: 2.25rem;
		text-align: left;
	}

	thead tr:nth-child(2) th {
		top: 2.25rem;
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

	th {
		color: var(--color-gray-600);
		font-weight: 400;
	}

	td {
		color: var(--color-gray-800);
		font-weight: 500;
		height: 3.125rem;
		padding: 0.625rem 0.5rem;
	}

	/* hatched rows mark the matrix as read-only; the pattern of the Figma
	   component (#fff5f5/#ffebeb), overlaid at 75% like in the design */
	td.locked {
		background: repeating-linear-gradient(
			45deg,
			rgba(255, 245, 245, 0.75),
			rgba(255, 245, 245, 0.75) 2px,
			rgba(255, 235, 235, 0.75) 2px,
			rgba(255, 235, 235, 0.75) 4px
		);
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

	.add-controls {
		align-items: center;
		display: flex;
		gap: 0.5rem;
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
		min-width: 10.3125rem;
		width: 10.3125rem;
	}

	.col-grant {
		min-width: 7.5rem;
		width: 7.5rem;
	}

	.col-actions {
		min-width: 3.5rem;
		text-align: center;
	}

	.add-row td {
		border-right: none;
		height: 3rem;
		padding-bottom: 0;
		padding-top: 0;
	}

	/* the hint of an empty matrix, in the muted text of the design */
	.empty-row td {
		border: none;
		color: var(--color-text-subtle);
		font-weight: 400;
		height: 3rem;
	}
</style>
