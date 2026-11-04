<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import UsersGroupIcon from '~icons/flowbite/users-group-outline';
	import requestSubmit from '$lib/client/requestSubmit';
	import AdministrativeAreaCombobox from '$lib/components/AdministrativeAreaCombobox.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import EditableSlug from '$lib/components/EditableSlug.svelte';
	import EditableSuperordinateOrganizationalUnit from '$lib/components/EditableSuperordinateOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type Container,
		type OrganizationalUnitPayload,
		organizationalUnitType
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import { workspaceModules, workspaces } from '$lib/workspaces';

	interface Props {
		container: Container<OrganizationalUnitPayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const selectableWorkspaces = $derived(workspaces.filter((w) => w.key !== 'help'));

	const selectableWorkspaceKeys = $derived(selectableWorkspaces.map((w) => w.key));

	const administrativeAreaLabelId = crypto.randomUUID();

	const workspaceOptions = $derived(
		workspaceModules.flatMap((module) =>
			selectableWorkspaces
				.filter((w) => w.module === module.key)
				.map((w) => ({
					value: w.key,
					label: `${$_(`workspace.module.${module.key}`)} \u2013 ${$_(`workspace.${w.key}.title`)}`
				}))
		)
	);

	const features = $derived(createFeatureDecisions(page.data.features));

	// The kind of the unit: a team leaves the sidebar and becomes a subject of
	// other matrices, so turning a unit into one is confirmed first. The
	// choice shows the pending kind while the confirmation is open.
	const teamType = organizationalUnitType.enum['organizational_unit_type.team'];

	const isAdministrativeArea = $derived(
		container.payload.organizationalUnitType ===
			organizationalUnitType.enum['organizational_unit_type.administrative_area']
	);

	const isTeam = $derived(container.payload.organizationalUnitType === teamType);

	let convertPending = $state(false);

	// the properties stay mounted while their dialog is closed, so an
	// unconfirmed conversion is dropped once the dialog closes; reopening
	// then shows the stored kind
	let typeChoice: HTMLDivElement | undefined = $state();

	$effect(() => {
		const dialog = typeChoice?.closest('dialog');
		if (!dialog) {
			return;
		}
		const reset = () => (convertPending = false);
		dialog.addEventListener('close', reset);
		return () => dialog.removeEventListener('close', reset);
	});

	const typeOptions = $derived([
		{ label: $_('organizational_unit'), value: 'organizational_unit' },
		{ label: $_('team'), value: teamType }
	]);

	function selectType(value: string | undefined) {
		if (value === teamType) {
			convertPending = !isTeam;
			return;
		}
		convertPending = false;
		if (isTeam) {
			container.payload.organizationalUnitType = undefined;
		}
	}

	function convert(event: Event) {
		convertPending = false;
		container.payload.organizationalUnitType = teamType;
		requestSubmit(event);
	}

	// In edit mode, an empty `visibleWorkspaces` historically meant "show all".
	// Prefill with every selectable workspace so unchecking a box reliably hides
	// that workspace; without this, unchecking reads as "still empty = show all".
	$effect(() => {
		if (!editable) {
			return;
		}

		if (container.payload.visibleWorkspaces.length === 0) {
			container.payload.visibleWorkspaces = [...selectableWorkspaceKeys];
		}
	});

	const stateFromOfficialRegionalCode = new Map([
		['01', 'Schleswig-Holstein'],
		['02', 'Hamburg'],
		['03', 'Niedersachsen'],
		['04', 'Bremen'],
		['05', 'Nordrhein-Westfalen'],
		['06', 'Hessen'],
		['07', 'Rheinland-Pfalz'],
		['08', 'Baden-Württemberg'],
		['09', 'Bayern'],
		['10', 'Saarland'],
		['11', 'Berlin'],
		['12', 'Brandenburg'],
		['13', 'Mecklenburg-Vorpommern'],
		['14', 'Sachsen'],
		['15', 'Sachsen-Anhalt'],
		['16', 'Thüringen']
	]);

	function onchange(event: Event) {
		const selected = (event as CustomEvent).detail.selected;

		if (
			selected === undefined ||
			selected?.officialRegionalCode === container.payload.officialRegionalCode
		) {
			return;
		}

		if (selected === null) {
			container.payload.geometry = undefined;
			container.payload.cityAndMunicipalityTypeBBSR = undefined;
			container.payload.federalState = undefined;
			container.payload.officialMunicipalityKey = undefined;
			container.payload.officialRegionalCode = undefined;
		} else {
			container.payload.geometry = selected.boundary.id;
			container.payload.cityAndMunicipalityTypeBBSR =
				selected.cityAndMunicipalityTypeBBSR ?? undefined;
			container.payload.federalState = stateFromOfficialRegionalCode.get(
				selected.officialRegionalCode.substring(0, 2)
			);
			container.payload.officialMunicipalityKey = selected.officialMunicipalityKey ?? undefined;
			container.payload.officialRegionalCode = selected.officialRegionalCode ?? undefined;
		}

		requestSubmit(event);
	}
</script>

{#snippet general()}
	{#if features.usePermissionMatrix() && !isAdministrativeArea}
		<!-- picking the team kind only opens the confirmation, so the form is
		     not saved before it is confirmed -->
		<div
			bind:this={typeChoice}
			class="type-choice"
			oninput={(event) => {
				if ((event.target as HTMLInputElement).value === teamType && !isTeam) {
					event.stopPropagation();
				}
			}}
		>
			<EditableSingleChoice
				{editable}
				label={$_('organizational_unit.type')}
				options={typeOptions}
				bind:value={() => (convertPending || isTeam ? teamType : 'organizational_unit'), selectType}
			/>
		</div>

		{#if convertPending}
			<div class="hint">
				<span class="hint-icon"><UsersGroupIcon /></span>
				<div class="hint-body">
					<p class="hint-heading">{$_('teams.convert_heading')}</p>
					<p class="hint-text">
						{$_('teams.convert_message', { values: { name: container.payload.name } })}
					</p>
					<div class="hint-actions">
						<button class="button-primary button-xs system-primary" type="button" onclick={convert}>
							{$_('teams.convert_button')}
						</button>
						<button
							class="button-alternate-outline button-xs"
							type="button"
							onclick={() => (convertPending = false)}
						>
							{$_('cancel')}
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<div class="label" id={administrativeAreaLabelId}>{$_('administrative_area')}</div>
	<AdministrativeAreaCombobox
		{editable}
		labelledBy={administrativeAreaLabelId}
		{onchange}
		value={container.payload.officialRegionalCode
			? {
					geometry: container.payload.geometry,
					officialRegionalCode: container.payload.officialRegionalCode
				}
			: undefined}
	/>

	<EditableNumber
		{editable}
		label={$_('organizational_unit.level')}
		bind:value={container.payload.level}
	/>

	<EditableSuperordinateOrganizationalUnit {editable} bind:container />

	<EditableMultipleChoice
		{editable}
		label={$_('properties.subheading.visible_workspaces')}
		options={workspaceOptions}
		bind:value={container.payload.visibleWorkspaces}
	/>

	{#if $ability.can('update', container, 'payload.slug')}
		<EditableSlug {editable} bind:container />
	{/if}

	{#if $ability.can('update', container, 'payload.visibility')}
		<EditableVisibility {editable} bind:container />
	{/if}
{/snippet}

{#snippet categories()}
	<EditableCategories bind:container {editable} />
{/snippet}

<div class="details-section">
	<div class="data-grid">
		{@render general()}
		{@render categories()}
	</div>
</div>

<style>
	.type-choice {
		display: contents;
	}

	/* the confirmation of the design: a framed note spanning both columns */
	.hint {
		background: var(--color-surface-default);
		border: 1px solid var(--color-border-default);
		border-radius: 8px;
		display: flex;
		gap: 0.75rem;
		grid-column: 1 / -1;
		padding: 1rem;
	}

	.hint-icon {
		align-items: center;
		background: var(--color-background-accent-subtle);
		border-radius: 8px;
		color: var(--color-text-accent-default);
		display: inline-flex;
		flex-shrink: 0;
		height: 2rem;
		justify-content: center;
		width: 2rem;
	}

	.hint-icon :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.hint-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.hint-heading {
		color: var(--color-text-strong);
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
	}

	.hint-text {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		margin: 0;
	}

	.hint-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.hint-actions > button {
		border-radius: 8px;
		font-size: 0.875rem;
		min-height: 1.75rem;
		padding-left: 0.75rem;
		padding-right: 0.75rem;
	}

	.hint-actions > .button-alternate-outline {
		background: var(--color-surface-default);
		border-color: var(--color-border-subtle);
	}
</style>
