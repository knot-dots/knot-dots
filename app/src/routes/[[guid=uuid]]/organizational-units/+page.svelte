<script lang="ts">
	import { browser } from '$app/environment';
	import AdministrativeAreaCard from '$lib/components/AdministrativeAreaCard.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';
	import {
		administrativeTypes,
		computeFacetCount,
		isOrganizationalUnitContainer
	} from '$lib/models';

	let { data }: PageProps = $props();

	let facets = $derived.by(() => {
		const cityAndMunicipalityTypeFacet = new Map([
			['Großstadt', 0],
			['Mittelstadt', 0],
			['Größere Kleinstadt', 0],
			['Kleine Kleinstadt', 0],
			['Landgemeinde', 0]
		]);

		const federalStateFacet = new Map([
			['Baden-Württemberg', 0],
			['Bayern', 0],
			['Berlin', 0],
			['Brandenburg', 0],
			['Bremen', 0],
			['Hamburg', 0],
			['Hessen', 0],
			['Mecklenburg-Vorpommern', 0],
			['Niedersachsen', 0],
			['Nordrhein-Westfalen', 0],
			['Rheinland-Pfalz', 0],
			['Saarland', 0],
			['Sachsen', 0],
			['Sachsen-Anhalt', 0],
			['Schleswig-Holstein', 0],
			['Thüringen', 0]
		]);

		const facets = new Map([
			['administrativeType', new Map(administrativeTypes.options.map((v) => [v as string, 0]))],
			['cityAndMunicipalityTypeBBSR', cityAndMunicipalityTypeFacet],
			['federalState', federalStateFacet]
		]);

		return computeFacetCount(facets, data.containers.filter(isOrganizationalUnitContainer));
	});
</script>

<Layout>
	{#snippet header()}
		<Header workspaceOptions={[]} {facets} filterBarInitiallyOpen search />
	{/snippet}

	{#snippet main()}
		<Catalog containers={data.containers.slice(0, browser ? undefined : 20)} payloadType={[]}>
			{#snippet item(container)}
				<AdministrativeAreaCard {container} />
			{/snippet}
		</Catalog>
	{/snippet}
</Layout>
