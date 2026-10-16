<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import ProgramTable from '$lib/components/ProgramTable.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { computeFacetCount, type Container, type ProgramPayload, status } from '$lib/models';

	interface Props {
		container: Container<ProgramPayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		selected: new SvelteSet<string>()
	});

	let categoryContext = $derived(page.data.categoryContext);

	let facets = $derived(
		computeFacetCount(
			new Map([
				['status', new Map(status.options.map((s) => [s, 0]))],
				...buildCategoryFacetsWithCounts(categoryContext.options)
			]),
			containers
		)
	);
</script>

<Header {facets} search />

<div class="content">
	<ProgramTable program={container} {containers} />

	<ContextTabs slug="all-table" />
</div>
