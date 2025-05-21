<script lang="ts">
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import MeasureTypeFilter from '$lib/components/MeasureTypeFilter.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import type { MeasureContainer } from '$lib/models';

	interface Props {
		containers: MeasureContainer[];
	}

	let { containers }: Props = $props();
</script>

<aside>
	<Sidebar helpSlug="overlay-measures">
		<svelte:fragment slot="filters">
			<AudienceFilter />
			<CategoryFilter />
			<TopicFilter />
			<PolicyFieldBNKFilter />
			<MeasureTypeFilter />
		</svelte:fragment>
		<Sort slot="sort" />
		<slot slot="extra" />
	</Sidebar>
</aside>
<Measures {containers} />
