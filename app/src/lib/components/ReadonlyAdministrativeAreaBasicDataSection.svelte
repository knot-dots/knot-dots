<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type AdministrativeAreaBasicDataContainer,
		type OrganizationalUnitContainer
	} from '$lib/models';

	interface Props {
		container: AdministrativeAreaBasicDataContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: OrganizationalUnitContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{container.payload.title}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
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
