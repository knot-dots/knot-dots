<script lang="ts">
	import Indicators from '$lib/components/Indicators.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { IndicatorContainer } from '$lib/models';

	export let containers: IndicatorContainer[];
</script>

<aside>
	<Sidebar helpSlug="overlay-indicators">
		<slot slot="extra" />
	</Sidebar>
</aside>
<Indicators {containers} />
