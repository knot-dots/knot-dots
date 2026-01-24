<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { Container, ContentPartnerPayload } from '$lib/models';

	interface Props {
		container: Container<ContentPartnerPayload>;
	}

	let { container }: Props = $props();
</script>

<Card {container} />
