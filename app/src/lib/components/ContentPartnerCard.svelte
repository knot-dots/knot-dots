<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { ContentPartnerContainer } from '$lib/models';

	interface Props {
		container: ContentPartnerContainer;
	}

	let { container }: Props = $props();
</script>

<Card {container} />
