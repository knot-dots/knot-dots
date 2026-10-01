<script lang="ts">
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');
</script>

{@render children()}
