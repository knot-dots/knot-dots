<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');

	let sidebarExpanded: boolean | undefined = $state(undefined);

	setContext('sidebar', {
		get expanded() {
			return sidebarExpanded;
		},
		collapse() {
			sidebarExpanded = false;
		},
		expand() {
			sidebarExpanded = true;
		}
	});

	// Lets end-to-end tests wait until the client router has started.
	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});
</script>

{@render children()}
