<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Chapters from '$lib/components/Chapters.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type AnyPayload,
		computeFacetCount,
		type Container,
		isProgramContainer,
		status
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		cascadingDelete: true,
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
	<Chapters program={isProgramContainer(container) ? container : undefined} {containers} />

	<Help slug="all-level" />
</div>
