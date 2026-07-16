<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import requestSubmit from '$lib/client/requestSubmit';
	import AdministrativeAreaCombobox from '$lib/components/AdministrativeAreaCombobox.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import EditableSlug from '$lib/components/EditableSlug.svelte';
	import EditableSuperordinateOrganizationalUnit from '$lib/components/EditableSuperordinateOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import type { Container, OrganizationalUnitPayload } from '$lib/models';
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
			container.payload.nameBBSR = undefined;
			container.payload.nameOSM = undefined;
			container.payload.officialMunicipalityKey = undefined;
			container.payload.officialRegionalCode = undefined;
		} else {
			container.payload.geometry = selected.boundary.id;
			container.payload.cityAndMunicipalityTypeBBSR =
				selected.cityAndMunicipalityTypeBBSR ?? undefined;
			container.payload.federalState = stateFromOfficialRegionalCode.get(
				selected.officialRegionalCode.substring(0, 2)
			);
			container.payload.nameOSM = selected.nameOSM;
			container.payload.officialMunicipalityKey = selected.officialMunicipalityKey ?? undefined;
			container.payload.officialRegionalCode = selected.officialRegionalCode ?? undefined;
		}

		requestSubmit(event);
	}
</script>

<div class="details-section">
	<div class="data-grid">
		{#if editable}
			<div class="label" id={administrativeAreaLabelId}>{$_('administrative_area')}</div>
			<AdministrativeAreaCombobox
				labelledBy={administrativeAreaLabelId}
				{onchange}
				value={container.payload.nameOSM && container.payload.officialRegionalCode
					? {
							nameOSM: container.payload.nameOSM,
							officialRegionalCode: container.payload.officialRegionalCode
						}
					: undefined}
			/>
		{:else}
			<span class="label">{$_('administrative_area')}</span>
			<span class="value"></span>
		{/if}

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

		{#if features.useUrlSlug() && $ability.can('update', container, 'payload.slug')}
			<EditableSlug {editable} bind:value={container.payload.slug} />
		{/if}

		{#if $ability.can('update', container, 'payload.visibility')}
			<EditableVisibility {editable} bind:container />
		{/if}

		<div class="data-grid-subheading">{$_('properties.subheading.categories')}</div>
		<EditableCategories bind:container {editable} />
	</div>
</div>

<style>
	@container (min-inline-size: 40rem) {
		.data-grid {
			grid-template-columns: 10rem minmax(0, 1fr);
		}
	}
</style>
