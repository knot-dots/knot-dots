<script lang="ts">
	import Viewer from '$lib/components/Viewer.svelte';
	import type { Container } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: Container;

	applicationState.update((state) => ({ ...state, containerDetailView: { tabs: [] } }));
</script>

<article class="details">
	{#if 'body' in container.payload}
		<Viewer value={container.payload.body} />
	{/if}
</article>
