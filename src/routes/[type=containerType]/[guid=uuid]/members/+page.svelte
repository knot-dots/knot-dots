<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';
	import Members from '$lib/components/Members.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar slot="sidebar" />
	<svelte:fragment slot="main">
		<Members container={data.container} users={data.users} />
	</svelte:fragment>
</Layout>
