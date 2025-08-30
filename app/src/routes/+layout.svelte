<script lang="ts">
	import { onMount } from 'svelte';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import { env } from '$env/dynamic/public';
	import SignupDialog from '$lib/components/SignupDialog.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');

	onMount(() => {
		if (data.user) {
			dialog.showModal();
		}
	});
</script>

<svelte:head>
	<title>{$_('page_title')}</title>

	{#if env.PUBLIC_MATOMO_CONTAINER_ID}
		{@html `<script>
  var _mtm = window._mtm = window._mtm || [];
  _mtm.push({'mtm.startTime': (new Date().getTime()), 'event': 'mtm.Start'});
  (function() {
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src='https://cdn.matomo.cloud/knotdots.matomo.cloud/container_${env.PUBLIC_MATOMO_CONTAINER_ID}.js'; s.parentNode.insertBefore(g,s);
  })();
</script>`}
	{/if}
</svelte:head>

{@render children()}

<SignupDialog bind:dialog />
