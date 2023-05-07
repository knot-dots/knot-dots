<script lang="ts">
	import Details from '$lib/components/Details.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Details
	container={data.container}
	isPartOfOptions={data.isPartOfOptions}
	relationObjects={data.relationObjects}
/>
