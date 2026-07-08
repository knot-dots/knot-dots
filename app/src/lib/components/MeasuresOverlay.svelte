<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		computeFacetCount,
		isMeasureContainer,
		isSimpleMeasureContainer,
		type MeasureContainer,
		predicates
	} from '$lib/models';

	interface Props {
		containers: MeasureContainer[];
	}

	let { containers }: Props = $props();

	setBulkActionContext({
		actions: ['status', 'visibility', 'delete'],
		cascadingDelete: true,
		selected: new SvelteSet<string>()
	});

	let categoryContext = $derived(page.data.categoryContext);

	let memberFacet = $derived(
		containers
			.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
			.flatMap(({ user }) =>
				user
					.filter(({ predicate }) => predicate == predicates.enum['is-member-of'])
					.map(({ subject }) => subject)
			)
			.reduce((accumulator, currentValue) => {
				if (accumulator.has(currentValue)) {
					accumulator.set(currentValue, accumulator.get(currentValue)! + 1);
				} else {
					accumulator.set(currentValue, 1);
				}
				return accumulator;
			}, new Map())
	);

	let facets = $derived(
		computeFacetCount(
			new Map([...buildCategoryFacetsWithCounts(categoryContext.options), ['member', memberFacet]]),
			containers
		)
	);
</script>

<Header {facets} search />

<Measures {containers} />

<Help slug="measures-status" />
