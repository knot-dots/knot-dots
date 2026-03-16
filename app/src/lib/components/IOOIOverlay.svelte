<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import { type Container, type GoalContainer, type MeasureContainer } from '$lib/models';

	interface Props {
		container: MeasureContainer | GoalContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();
</script>

<Header />

<IOOI {container} {containers}></IOOI>

<Help slug="iooi" />
