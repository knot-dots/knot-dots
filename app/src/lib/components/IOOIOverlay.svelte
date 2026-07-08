<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { type Container, type GoalContainer, type MeasureContainer } from '$lib/models';

	interface Props {
		container: MeasureContainer | GoalContainer;
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

<IOOI {container} {containers}></IOOI>

<Help slug="iooi" />
