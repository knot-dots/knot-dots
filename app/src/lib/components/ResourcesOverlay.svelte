<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import { payloadTypes, type Container } from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();
</script>

<Header search />

<div class="content">
	<Catalog {containers} payloadType={[payloadTypes.enum.resource_v2]} hideCreateButton={true} />

	<ContextTabs slug="resources-catalog" />
</div>
