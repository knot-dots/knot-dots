<script lang="ts">
	import { setContext } from 'svelte';
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
</script>

{@render children()}
