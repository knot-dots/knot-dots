<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import AdministrativeAreaCombobox from '$lib/components/AdministrativeAreaCombobox.svelte';
	import EditableCustomDomain from '$lib/components/EditableCustomDomain.svelte';
	import EditableCustomFavicon from '$lib/components/EditableCustomFavicon.svelte';
	import EditableOrganizationCategory from '$lib/components/EditableOrganizationCategory.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import type { OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import { workspaceModules, workspaces } from '$lib/workspaces';

	interface Props {
		container: OrganizationContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const administrativeAreaLabelId = crypto.randomUUID();

	const selectableWorkspaces = $derived(
		container.payload.default ? workspaces : workspaces.filter((w) => w.key !== 'help')
	);

	const selectableWorkspaceKeys = $derived(selectableWorkspaces.map((w) => w.key));

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

<div class="details-section">
	<div class="data-grid">
		{#if editable}
			<div class="label" id={administrativeAreaLabelId}>{$_('administrative_area')}</div>
			<AdministrativeAreaCombobox
				labelledBy={administrativeAreaLabelId}
				{onchange}
				value={container.payload.officialRegionalCode
					? {
							geometry: container.payload.geometry,
							officialRegionalCode: container.payload.officialRegionalCode
						}
					: undefined}
			/>
		{:else}
			<span class="label">{$_('administrative_area')}</span>
			<span class="value"></span>
		{/if}

		<EditableOrganizationCategory {editable} bind:value={container.payload.organizationCategory} />

		<EditableMultipleChoice
			{editable}
			label={$_('properties.subheading.visible_workspaces')}
			options={workspaceOptions}
			bind:value={container.payload.visibleWorkspaces}
		/>

		{#if $ability.can('update', container, 'payload.customDomain')}
			<EditableCustomDomain {editable} bind:value={container.payload.customDomain} />
		{/if}

		{#if $ability.can('update', container, 'payload.customFavicon')}
			<EditableCustomFavicon {editable} bind:value={container.payload.customFavicon} />
		{/if}

		{#if $ability.can('update', container, 'payload.visibility')}
			<EditableVisibility {editable} bind:container />
		{/if}
	</div>
</div>
