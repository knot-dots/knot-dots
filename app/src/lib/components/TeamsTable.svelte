<script lang="ts">
	import { tick } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import PlusIcon from '~icons/flowbite/plus-outline';
	import TrashBinIcon from '~icons/flowbite/trash-bin-outline';
	import UserIcon from '~icons/flowbite/user-outline';
	import UsersGroupIcon from '~icons/flowbite/users-group-outline';
	import OrganizationalUnitIcon from '~icons/knotdots/organizational-unit';
	import tooltip from '$lib/attachments/tooltip';
	import deleteContainer from '$lib/client/deleteContainer';
	import createTeam from '$lib/client/createTeam';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import TeamChip from '$lib/components/TeamChip.svelte';
	import { getToastContext } from '$lib/contexts/toast';
	import {
		type Container,
		containerOfType,
		displayName,
		isOrganizationalUnitContainer,
		type OrganizationalUnitPayload,
		organizationalUnitType,
		type OrganizationPayload,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		type TeamWithMembers,
		type User
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		// the organization or unit whose users are managed
		container: Container<OrganizationPayload | OrganizationalUnitPayload>;
		managedOrganizationalUnits: Container<OrganizationalUnitPayload>[];
		teams: TeamWithMembers[];
	}

	let { container, managedOrganizationalUnits, teams }: Props = $props();

	const toast = getToastContext();

	// svelte-ignore non_reactive_update
	let confirmDeleteDialog: HTMLDialogElement;

	let teamToDelete: Container<OrganizationalUnitPayload> | null = $state(null);

	// the row being added: a name, and the area the team belongs to
	let creating = $state(false);
	let name = $state('');
	let area: string = $state('');
	let saving = $state(false);

	const organization = $derived(page.data.currentOrganization);

	// the areas managed here: the selected context and the units below it
	const areas = $derived([
		{ guid: container.guid, name: container.payload.name },
		...managedOrganizationalUnits
			.filter(
				(unit) =>
					unit.payload.organizationalUnitType !==
					organizationalUnitType.enum['organizational_unit_type.team']
			)
			.map(({ guid, payload }) => ({ guid, name: payload.name }))
	]);

	const areaName = $derived(areas.find(({ guid }) => guid === area)?.name ?? '');

	function areaOf(team: Container<OrganizationalUnitPayload>) {
		return (
			team.relation.find(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-part-of'] && subject === team.guid
			)?.object ?? team.organization
		);
	}

	function areaNameOf(team: Container<OrganizationalUnitPayload>) {
		const guid = areaOf(team);
		return (
			page.data.organizationalUnits.find((unit) => unit.guid === guid)?.payload.name ??
			organization.payload.name
		);
	}

	// the teams of the areas managed here, narrowed by the search terms
	const visibleTeams = $derived.by(() => {
		const managed = new Set(areas.map(({ guid }) => guid));
		const terms = page.url.searchParams.get('terms')?.trim().toLocaleLowerCase() ?? '';
		return teams
			.filter((team) => managed.has(areaOf(team.container)))
			.filter((team) => team.container.payload.name.toLocaleLowerCase().includes(terms))
			.sort((a, b) => a.container.payload.name.localeCompare(b.container.payload.name));
	});

	const mayCreate = $derived(
		$ability.can('create', containerOfType(payloadTypes.enum.organizational_unit, organization))
	);

	// the first three members by name, the rest counted
	function membersLabel(members: User[]) {
		const names = members.map(displayName).sort((a, b) => a.localeCompare(b));
		if (names.length <= 4) {
			return names.join(', ');
		}
		return $_('teams.and_more', {
			values: { count: names.length - 3, names: names.slice(0, 3).join(', ') }
		});
	}

	function start() {
		name = '';
		area = container.guid;
		creating = true;
	}

	function cancel() {
		creating = false;
	}

	// a team is a unit of its own kind below the chosen area; once saved, its
	// roster opens in the overlay
	async function create() {
		const trimmed = name.trim();
		if (!trimmed || saving) {
			return;
		}
		saving = true;
		// the chosen area is the selected context itself or a unit below it; the
		// organization as context leaves the team without a parent
		const parent = [container, ...managedOrganizationalUnits]
			.filter(isOrganizationalUnitContainer)
			.find(({ guid }) => guid === area);
		try {
			const response = await createTeam(trimmed, organization, parent);
			if (!response.ok) {
				toast({ heading: $_('error.unexpected'), status: 'error' });
				return;
			}
			const created = (await response.json()) as Container<OrganizationalUnitPayload>;
			creating = false;
			await invalidateAll();
			await goto(overlayURL(page.url, overlayKey.enum.team, created.guid));
		} finally {
			saving = false;
		}
	}

	async function remove(event: SubmitEvent) {
		event.preventDefault();
		if (!teamToDelete) {
			return;
		}
		const response = await deleteContainer(teamToDelete);
		confirmDeleteDialog.close();
		if (!response.ok) {
			toast({ heading: $_('error.unexpected'), status: 'error' });
			return;
		}
		teamToDelete = null;
		await invalidateAll();
	}
</script>

{#if teamToDelete}
	<ConfirmDeleteDialog
		bind:dialog={confirmDeleteDialog}
		container={teamToDelete}
		handleSubmit={remove}
		relatedContainers={[]}
	/>
{/if}

<div class="table-wrapper table-wrapper--with-end-padding">
	<table>
		<thead>
			<tr>
				<th class="col-team">
					<span class="header-content">
						<UsersGroupIcon />
						<span class="truncated">{$_('team')}</span>
					</span>
				</th>
				<th class="col-members">
					<span class="header-content">
						<UserIcon />
						<span class="truncated">{$_('teams.members')}</span>
					</span>
				</th>
				<th class="col-area">
					<span class="header-content">
						<OrganizationalUnitIcon />
						<span class="truncated">{$_('teams.belongs_to')}</span>
					</span>
				</th>
				<th class="col-actions"></th>
			</tr>
		</thead>
		<tbody>
			{#each visibleTeams as team (team.container.guid)}
				<tr>
					<td class="col-team"><TeamChip {team} /></td>
					<td class="col-members">
						{#if team.members.length > 0}
							{membersLabel(team.members)}
						{:else}
							<span class="is-empty">{$_('teams.no_members')}</span>
						{/if}
					</td>
					<td class="col-area">{areaNameOf(team.container)}</td>
					<td class="col-actions">
						{#if $ability.can('delete', team.container)}
							<button
								{@attach tooltip($_('delete'))}
								class="action-button"
								type="button"
								onclick={async () => {
									teamToDelete = team.container;
									await tick();
									confirmDeleteDialog.showModal();
								}}
							>
								<TrashBinIcon />
							</button>
						{/if}
					</td>
				</tr>
			{/each}
			{#if creating}
				<tr class="create-row">
					<td class="col-team focus-indicator">
						<!-- svelte-ignore a11y_autofocus -->
						<input
							aria-label={$_('teams.name_placeholder')}
							autofocus
							disabled={saving}
							placeholder={$_('teams.name_placeholder')}
							type="text"
							bind:value={name}
							onkeydown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									create();
								} else if (event.key === 'Escape') {
									cancel();
								}
							}}
						/>
					</td>
					<td class="col-members"><span class="is-empty">{$_('teams.no_members')}</span></td>
					<td class="col-area">
						<Dropdown label={$_('teams.belongs_to')}>
							{#snippet button(popover)}
								<button
									class="dropdown-button dropdown-button--select"
									type="button"
									use:popover.button
								>
									<span class="truncated">{areaName}</span>
								</button>
							{/snippet}
							{#snippet panel(popover)}
								<fieldset class="listbox">
									{#each areas as option (option.guid)}
										<label>
											<input
												checked={option.guid === area}
												name="team-area"
												type="radio"
												value={option.guid}
												onchange={() => {
													area = option.guid;
													popover.close();
												}}
											/>
											<span class="truncated">{option.name}</span>
										</label>
									{/each}
								</fieldset>
							{/snippet}
						</Dropdown>
					</td>
					<td class="col-actions">
						<button
							{@attach tooltip($_('cancel'))}
							class="action-button"
							type="button"
							onclick={cancel}
						>
							<TrashBinIcon />
						</button>
					</td>
				</tr>
			{/if}
		</tbody>
	</table>

	{#if mayCreate && !creating}
		<button class="button-alternate button-xs system-primary" type="button" onclick={start}>
			<PlusIcon />
			<span>{$_('teams.create')}</span>
		</button>
	{/if}
</div>

<style>
	table {
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.875rem;
		margin-bottom: 0.625rem;
		position: relative;
		width: max-content;
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 1;
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
		padding: 0 0.5rem;
	}

	.header-content {
		align-items: center;
		display: flex;
		gap: 0.375rem;
	}

	.header-content :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.col-team {
		--form-control-background: transparent;
		--form-control-border: none;
		--form-control-border-radius: 0;
		--form-control-padding-x: 0;
		--form-control-padding-y: 0;

		color: var(--color-text-strong);
		min-width: 16.25rem;
		width: 16.25rem;
	}

	.col-team input:focus {
		outline-style: none;
	}

	.col-members {
		min-width: 25rem;
		width: 25rem;
	}

	.col-area {
		--dropdown-button-default-background: transparent;
		--dropdown-button-border-width: 1px;
		--dropdown-button-border-radius: 8px;

		min-width: 17.5rem;
		width: 17.5rem;
	}

	.col-actions {
		min-width: 3.5rem;
		text-align: center;
		width: 3.5rem;
	}

	.is-empty {
		color: var(--color-text-subtle);
		font-weight: 400;
	}

	/* the row being added is an action bar, not a record: no row or cell
	   highlighting */
	tr.create-row,
	tr.create-row:hover {
		background-color: white;
	}

	tr.create-row td:hover {
		background-color: transparent;
	}
</style>
