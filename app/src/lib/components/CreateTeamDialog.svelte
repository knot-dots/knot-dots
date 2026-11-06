<script lang="ts">
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/flowbite/chevron-down-outline';
	import OrganizationalUnitIcon from '~icons/knotdots/organizational-unit';
	import createTeam from '$lib/client/createTeam';
	import Dialog from '$lib/components/Dialog.svelte';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { getToastContext } from '$lib/contexts/toast';
	import {
		type Container,
		type OrganizationalUnitPayload,
		organizationalUnitType
	} from '$lib/models';

	interface Props {
		dialog: HTMLDialogElement;
		oncreated: (team: Container<OrganizationalUnitPayload>) => Promise<void> | void;
		organization: string;
	}

	let { dialog = $bindable(), oncreated, organization }: Props = $props();

	const toast = getToastContext();

	const organizationContainer = $derived(
		page.data.organizations.find(({ guid }) => guid === organization) ??
			page.data.currentOrganization
	);

	// the areas a team can belong to: the organization and its units, teams
	// excluded; the current unit is the first guess
	const units = $derived(
		page.data.organizationalUnits.filter(
			(unit) =>
				unit.organization === organization &&
				unit.payload.organizationalUnitType !==
					organizationalUnitType.enum['organizational_unit_type.team']
		)
	);

	const areas = $derived([
		{ guid: organizationContainer.guid, name: organizationContainer.payload.name },
		...units.map(({ guid, payload }) => ({ guid, name: payload.name }))
	]);

	function initialArea() {
		const current = page.data.currentOrganizationalUnit;
		return current && units.some(({ guid }) => guid === current.guid)
			? current.guid
			: organizationContainer.guid;
	}

	let name = $state('');
	let area = $state(initialArea());
	let saving = $state(false);

	const areaName = $derived(areas.find(({ guid }) => guid === area)?.name ?? '');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed || saving) {
			return;
		}
		saving = true;
		try {
			const response = await createTeam(
				trimmed,
				organizationContainer,
				units.find(({ guid }) => guid === area)
			);
			if (!response.ok) {
				toast({ heading: $_('error.unexpected'), status: 'error' });
				return;
			}
			const created = (await response.json()) as Container<OrganizationalUnitPayload>;
			name = '';
			area = initialArea();
			dialog.close();
			await oncreated(created);
		} finally {
			saving = false;
		}
	}
</script>

<Dialog bind:dialog>
	<form onsubmit={handleSubmit}>
		<h3>{$_('teams.create')}</h3>
		<label>
			{$_('user.display_name')}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				autofocus
				disabled={saving}
				placeholder={$_('teams.name_placeholder')}
				required
				type="text"
				bind:value={name}
			/>
		</label>
		<div class="field">
			<span class="field-label">{$_('teams.belongs_to')}</span>
			<Dropdown label={$_('teams.belongs_to')} strategy="fixed">
				{#snippet button(popover)}
					<button class="area-select" type="button" use:popover.button>
						<span class="badge badge--large badge--purple badge--team">
							<OrganizationalUnitIcon />
							<span class="truncated">{areaName}</span>
						</span>
						<ChevronDownIcon />
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
		</div>
		<button class="button-primary system-primary" disabled={saving} type="submit">
			{$_('save')}
		</button>
	</form>
</Dialog>

<style>
	form h3 {
		margin-bottom: 1rem;
	}

	form > button {
		display: block;
		margin-top: 1.5rem;
		width: 100%;
	}

	form label,
	.field {
		display: block;
		margin-top: 1rem;
	}

	form input[type='text'] {
		display: block;
		width: 100%;
	}

	.field-label {
		display: block;
		margin-bottom: 0.25rem;
	}

	.field :global(.dropdown) {
		display: block;
	}

	.area-select,
	.area-select:hover,
	.area-select:active {
		align-items: center;
		background: var(--color-surface-default);
		border: 1px solid var(--color-border-default);
		border-radius: 8px;
		color: var(--color-text-default);
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		min-height: 2.25rem;
		padding: 0.25rem 0.75rem 0.25rem 0.25rem;
		width: 100%;
	}

	.area-select > :global(svg) {
		flex-shrink: 0;
		height: 0.75rem;
		width: 0.75rem;
	}

	.area-select .badge {
		--badge-icon-size: 1rem;

		max-width: 100%;
	}

	.listbox {
		border: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
		min-width: 17.5rem;
		padding: 0;
	}

	.listbox label {
		align-items: center;
		border-radius: 0.5rem;
		cursor: pointer;
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		margin: 0;
		min-height: 2.5rem;
		padding: 0.5rem;
	}

	.listbox label:hover {
		background-color: var(--color-gray-100);
	}

	.listbox input[type='radio'] {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}
</style>
