<script lang="ts">
	import Members from '$lib/components/Members.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Members container={data.container} users={data.users} />
