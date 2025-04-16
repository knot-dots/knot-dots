<script lang="ts">
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import Relations from '$lib/components/Relations.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import type { Container } from '$lib/models';

	export let containers: Container[];
</script>

<aside>
	<Sidebar helpSlug="relations">
		<Search slot="search" />
		<svelte:fragment slot="filters">
			<RelationTypeFilter />
			<AudienceFilter />
			<CategoryFilter />
			<TopicFilter />
			<PolicyFieldBNKFilter />
			<StrategyTypeFilter />
		</svelte:fragment>
		<Sort slot="sort" />
		<slot slot="extra" />
	</Sidebar>
</aside>
<Relations {containers} />
