<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		isOrganizationalUnitContainer,
		type AdministrativeAreaBasicDataContainer
	} from '$lib/models';
	import { sectionOf } from '$lib/relations';

	interface Props {
		container: AdministrativeAreaBasicDataContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(
		sectionOf(container, relatedContainers.filter(isOrganizationalUnitContainer))
	);
</script>

<header>
	<h2 class="details-heading" contenteditable="false">
		{container.payload.title}
	</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li><ContainerSettingsDropdown bind:container bind:relatedContainers /></li>
		</ul>
	{/if}
</header>

{#if parentContainer}
	<dl>
		{#if parentContainer.payload.federalState}
			<div>
				<dt>{$_('administrative_area.basic_data.federal_state')}</dt>
				<dd>{parentContainer.payload.federalState}</dd>
			</div>
		{/if}

		{#if parentContainer.payload.administrativeType}
			<div>
				<dt>{$_('administrative_area.basic_data.administrative_type')}</dt>
				<dd>{$_(parentContainer.payload.administrativeType)}</dd>
			</div>
		{/if}

		{#if parentContainer.payload.cityAndMunicipalityTypeBBSR}
			<div>
				<dt>{$_('administrative_area.basic_data.city_and_municipality_type_bbsr')}</dt>
				<dd>{parentContainer.payload.cityAndMunicipalityTypeBBSR}</dd>
			</div>
		{/if}

		{#if parentContainer.payload.officialMunicipalityKey}
			<div>
				<dt>{$_('administrative_area.basic_data.official_municipality_key')}</dt>
				<dd>{parentContainer.payload.officialMunicipalityKey}</dd>
			</div>
		{/if}
	</dl>
{/if}

<style>
	dl {
		flex-wrap: wrap;
		font-size: 0.875rem;
		display: flex;
		gap: 0.625rem;
		justify-content: space-between;
		margin: 0 -0.375rem;
	}

	dt {
		font-weight: 400;
		padding: 0 0.375rem;
	}

	dd {
		color: var(--color-gray-700);
		font-weight: 500;
		padding: 0.375rem;
	}
</style>
