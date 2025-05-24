<script lang="ts">
	import Viewer from '$lib/components/Viewer.svelte';
	import type { Container } from '$lib/models';

	export let container: Container;
</script>

<article class="details">
	{#if 'body' in container.payload}
		<Viewer value={container.payload.body} />
	{/if}
</article>
