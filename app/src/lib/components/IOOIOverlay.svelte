<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { type Container, type GoalPayload, type MeasurePayload } from '$lib/models';

	interface Props {
		container: Container<GoalPayload | MeasurePayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	setBulkActionContext({
		actions: ['status', 'visibility', 'delete'],
		cascadingDelete: true,
		selected: new SvelteSet<string>()
	});
</script>

<Header />

<div class="content">
	<IOOI {container} {containers}></IOOI>

	<ContextTabs slug="iooi" />
</div>
