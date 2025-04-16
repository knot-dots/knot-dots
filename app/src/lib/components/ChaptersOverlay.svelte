<script lang="ts">
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Chapters from '$lib/components/Chapters.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { type Container } from '$lib/models';

	export let containers: Container[];
</script>

<aside>
	<Sidebar helpSlug="chapters">
		<Search slot="search" />
		<svelte:fragment slot="filters">
			<AudienceFilter />
			<CategoryFilter />
			<TopicFilter />
			<PolicyFieldBNKFilter />
		</svelte:fragment>
		<Sort slot="sort" />
		<slot slot="extra" />
	</Sidebar>
</aside>
<Chapters {containers} />
