<script lang="ts">
	import { getContext } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import ArrowRightIcon from '~icons/flowbite/arrow-right-outline';
	import InfoIcon from '~icons/flowbite/info-circle-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UsersGroupIcon from '~icons/flowbite/users-group-outline';
	import OrganizationalUnitIcon from '~icons/knotdots/organizational-unit';
	import tooltip from '$lib/attachments/tooltip';
	import saveContainer from '$lib/client/saveContainer';
	import saveContainerUser from '$lib/client/saveContainerUser';
	import saveUser from '$lib/client/saveUser';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import InviteUserDialog from '$lib/components/InviteUserDialog.svelte';
	import SubjectCombobox, { type SubjectSuggestion } from '$lib/components/SubjectCombobox.svelte';
	import { getToastContext } from '$lib/contexts/toast';
	import {
		type Container,
		displayName,
		memberRoles,
		type OrganizationalUnitPayload,
		organizationalUnitType,
		predicates,
		type User
	} from '$lib/models';

	interface Props {
		container: Container<OrganizationalUnitPayload>;
		mayManage: boolean;
		// the area the team belongs to: the unit it is part of, else the organization
		parent: { guid: string; name: string };
		users: User[];
	}

	let { container, mayManage, parent, users }: Props = $props();

	const overlay = getContext('overlay');
	const toast = getToastContext();

	// svelte-ignore non_reactive_update
	let inviteDialog: HTMLDialogElement;

	const rolePredicates: string[] = [
		predicates.enum['is-admin-of'],
		predicates.enum['is-collaborator-of'],
		predicates.enum['is-head-of'],
		predicates.enum['is-member-of']
	];

	// the areas a team can belong to: the organization and its units, teams
	// excluded (the type guard would narrow the units to never when negated)
	const areaOptions = $derived([
		{ guid: page.data.currentOrganization.guid, name: page.data.currentOrganization.payload.name },
		...page.data.organizationalUnits
			.filter(
				(unit) =>
					unit.organization === container.organization &&
					unit.payload.organizationalUnitType !==
						organizationalUnitType.enum['organizational_unit_type.team'] &&
					unit.guid !== container.guid
			)
			.map(({ guid, payload }) => ({ guid, name: payload.name }))
	]);

	function reportFailure() {
		toast({ heading: $_('error.unexpected'), status: 'error' });
	}

	// the team moves below another unit (or directly below the organization)
	// by swapping its is-part-of relation
	async function moveTo(area: string) {
		if (area === parent.guid) {
			return;
		}
		const relation = container.relation.filter(
			({ predicate, subject }) =>
				!(predicate === predicates.enum['is-part-of'] && subject === container.guid)
		);
		if (area !== page.data.currentOrganization.guid) {
			relation.push({
				object: area,
				position: 0,
				predicate: predicates.enum['is-part-of'],
				subject: container.guid
			});
		}
		const response = await saveContainer({ ...container, relation });
		if (!response.ok) {
			reportFailure();
			return;
		}
		await invalidateAll();
	}

	async function addMember(suggestion: SubjectSuggestion) {
		if (suggestion.kind !== 'user') {
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

	async function removeMember(member: User) {
		const response = await saveContainerUser({
			...container,
			user: container.user.filter(
				({ predicate, subject }) => subject !== member.guid || !rolePredicates.includes(predicate)
			)
		});
		if (!response.ok) {
			reportFailure();
			return;
		}
		await invalidateAll();
	}

	function email(member: User) {
		return 'email' in member && typeof member.email === 'string' ? member.email : '';
	}
</script>

<div class="details-section">
	<header class="team-header">
		<h1 class="details-title">{container.payload.name}</h1>
		<ul class="labels">
			<li>
				<span class="badge badge--large badge--purple badge--team">
					<UsersGroupIcon />
					<span class="truncated">{$_('team')}</span>
				</span>
			</li>
			{#if mayManage}
				<li>
					<Dropdown label={$_('teams.belongs_to')}>
						{#snippet button(popover)}
							<button class="dropdown-button" type="button" use:popover.button>
								<span class="badge badge--large badge--purple badge--team">
									<OrganizationalUnitIcon />
									<span class="truncated">{parent.name}</span>
								</span>
							</button>
						{/snippet}
						{#snippet panel(popover)}
							<fieldset class="listbox">
								{#each areaOptions as option (option.guid)}
									<label>
										<input
											checked={option.guid === parent.guid}
											name="area"
											type="radio"
											value={option.guid}
											onchange={() => {
												popover.close();
												moveTo(option.guid);
											}}
										/>
										<span class="truncated">{option.name}</span>
									</label>
								{/each}
							</fieldset>
						{/snippet}
					</Dropdown>
				</li>
			{:else}
				<li>
					<span class="badge badge--large badge--purple badge--team">
						<OrganizationalUnitIcon />
						<span class="truncated">{parent.name}</span>
					</span>
				</li>
			{/if}
			{#if !overlay}
				<a
					class="button button-alternate button-xs system-primary team-link"
					href={`/${container.guid}`}
				>
					<ArrowRightIcon />
					<span>{$_('teams.to_team')}</span>
				</a>
			{/if}
		</ul>
	</header>

	<div class="roster">
		<p class="roster-label">
			<span>{$_('teams.members_count', { values: { count: users.length } })}</span>
			{#if mayManage}
				<span
					aria-label={$_('teams.changes_apply_everywhere')}
					class="roster-hint"
					role="img"
					tabindex="0"
					{@attach tooltip($_('teams.changes_apply_everywhere'), { describe: true })}
				>
					<InfoIcon />
				</span>
			{/if}
		</p>

		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th class="col-name">{$_('user.display_name')}</th>
						{#if mayManage}
							<th class="col-email">{$_('user.email')}</th>
							<th class="col-actions"></th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each users as member (member.guid)}
						<tr>
							<td class="col-name">{displayName(member)}</td>
							{#if mayManage}
								<td class="col-email">{email(member)}</td>
								<td class="col-actions">
									<button
										aria-label={$_('user.remove')}
										class="action-button"
										type="button"
										onclick={() => removeMember(member)}
									>
										<TrashBinIcon />
									</button>
								</td>
							{/if}
						</tr>
					{:else}
						<tr class="empty-row">
							<td colspan={mayManage ? 3 : 1}>{$_('teams.no_members')}</td>
						</tr>
					{/each}
					{#if mayManage}
						<tr class="add-row">
							<td colspan="3">
								<SubjectCombobox
									excluded={users.map(({ guid }) => guid)}
									oninvite={() => inviteDialog.showModal()}
									onselect={addMember}
									organization={container.organization}
									placeholder={$_('teams.search_person')}
									teams={[]}
								/>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if mayManage}
	<InviteUserDialog {container} bind:dialog={inviteDialog} />
{/if}

<style>
	.team-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.team-header .details-title {
		margin-bottom: 0;
	}

	.labels {
		--badge-border-radius: 8px;
		--badge-border-width: 1px;
		--badge-icon-size: 1rem;
		--badge-min-height: 1.75rem;
		--badge-padding-x: 0.5rem;
		--dropdown-button-active-background: transparent;
		--dropdown-button-border-radius: 8px;
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: transparent;
		--dropdown-button-hover-background: transparent;
		--dropdown-button-gap: 0.125rem;
		--dropdown-button-padding-x: 0;
		--dropdown-button-padding-y: 0;

		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.labels li:not(:has(> button)) {
		border-radius: 12px;
		padding: 0.25rem;
	}

	.labels li:not(:has(> button)):hover {
		background-color: var(--color-background-accent-hover);
	}

	.team-link {
		font-size: 0.875rem;
		gap: 0.375rem;
		line-height: 1;
		margin-left: 0.5rem;
		min-height: 2rem;
	}

	.roster {
		margin-top: 2rem;
	}

	.roster-label {
		align-items: center;
		color: var(--color-text-default);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
	}

	.roster-hint {
		color: var(--color-icon-subtle);
		display: inline-flex;
	}

	.roster-hint :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.table-wrapper {
		margin: 0;
		padding-left: 0;
	}

	table {
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.875rem;
		width: max-content;
	}

	th,
	td {
		border-right: 1px solid var(--color-border-subtle);
		white-space: nowrap;
	}

	th:last-child,
	td:last-child {
		border-right: none;
	}

	th {
		font-weight: 400;
		height: 2.5rem;
	}

	td {
		font-weight: 500;
		height: 3.125rem;
	}

	.col-name {
		min-width: 13.75rem;
		width: 13.75rem;
	}

	.col-email {
		min-width: 18.75rem;
		width: 18.75rem;
	}

	.col-actions {
		min-width: 3.5rem;
		text-align: center;
	}

	/* the add row is an action bar, not a record: no row or cell highlighting */
	tr.add-row,
	tr.add-row:hover {
		background-color: white;
	}

	tr.add-row td {
		border: none;
		height: 3rem;
		padding-bottom: 0;
		padding-top: 0;
	}

	tr.add-row td:hover {
		background-color: transparent;
	}

	tr.empty-row td {
		border: none;
		color: var(--color-text-subtle);
		font-weight: 400;
		height: 3rem;
	}
</style>
