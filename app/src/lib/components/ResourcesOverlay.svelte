<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import { payloadTypes, type Container } from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();
</script>

<Header search />

<Catalog {containers} payloadType={[payloadTypes.enum.resource_v2]} editable={false} />

<Help slug="resources-catalog" />
