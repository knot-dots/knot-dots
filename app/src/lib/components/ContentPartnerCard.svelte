<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { ContentPartnerContainer } from '$lib/models';

	interface Props {
		container: ContentPartnerContainer;
		editable?: boolean;
	}

	let { container, editable = false }: Props = $props();
</script>

<Card {container} />
