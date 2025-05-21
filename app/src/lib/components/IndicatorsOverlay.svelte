<script lang="ts">
	import Indicators from '$lib/components/Indicators.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { Container } from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();
</script>

<aside>
	<Sidebar helpSlug="overlay-indicators">
		<slot slot="extra" />
	</Sidebar>
</aside>
<Indicators {containers} />
