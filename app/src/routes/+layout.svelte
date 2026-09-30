<script lang="ts">
	import { setContext } from 'svelte';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { navigating } from '$app/state';
	import navigationKind from '$lib/client/navigationKind';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
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

<!-- Changes of the query or hash only have their own loading indicators. -->
<ProgressBar active={navigationKind(navigating) === 'page'} />

{@render children()}
