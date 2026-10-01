<script lang="ts">
	import { setContext } from 'svelte';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { navigating } from '$app/state';
	import navigationKind from '$lib/client/navigationKind';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { LoadingTracker, setLoadingTrackerContext } from '$lib/contexts/loadingTracker.svelte';
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

	const loadingTracker = new LoadingTracker();

	setLoadingTrackerContext(loadingTracker);
</script>

<!-- Overlays, which are opened by changing the hash, have their own progress bar. -->
<ProgressBar
	active={loadingTracker.active ||
		navigationKind(navigating) === 'page' ||
		navigationKind(navigating) === 'query'}
/>

{@render children()}
