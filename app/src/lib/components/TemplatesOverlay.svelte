<script lang="ts">
	import { setContext } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type Container,
		predicates,
		templatablePayloadTypes,
		type ProgramPayload
	} from '$lib/models';

	interface Props {
		container: Container<ProgramPayload>;
		containers: Container[];
		facets: Map<string, Map<string, number>>;
	}

	let { container, containers, facets }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		selected: new SvelteSet<string>()
	});
</script>

<Header {facets} search />

<div class="content">
	<Catalog
		availableIn={container.guid}
		{containers}
		payloadType={[...templatablePayloadTypes]}
		createAsTemplate={true}
	/>

	<ContextTabs slug="templates-catalog" />
</div>
