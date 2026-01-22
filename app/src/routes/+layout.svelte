<script lang="ts">
	import { onMount } from 'svelte';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import { env } from '$env/dynamic/public';
	import SignupDialog from '$lib/components/SignupDialog.svelte';
	import UppyDashboardService from '$lib/components/UppyDashboardService.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';

	let { children, data }: LayoutProps = $props();

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');

	onMount(() => {
		if (data.user) {
			dialog.showModal();
		}
	});

	const workspaceTranslated = $derived.by(() => {
		const segments = page.url.pathname.split('/');
		let msgId = '';

		// Determine workspace type from URL segments
		if (segments[1] == 'me') {
			if (!segments[2]) {
				msgId = 'workspace.profile';
			} else {
				const personalWorkspaceType = segments[2];
				msgId = 'workspace.profile.' + personalWorkspaceType;
			}
		} else {
			const workspaceType = segments[2];

			if (!workspaceType) return null;

			msgId = 'workspace.type.' + workspaceType;
		}

		const translation = $_(msgId);

		// If translation is same as msgId, it means no translation was found and null should be returned
		return translation == msgId ? null : translation;
	});

	const title = $derived.by(() => {
		let title = page.data?.currentOrganization?.payload?.name ?? $_('page_title');

		// Add organizational unit if present
		if (page.data.currentOrganizationalUnit) {
			title += ' / ' + page.data.currentOrganizationalUnit.payload.name;
		}

		// Add workspace type if present
		if (workspaceTranslated) {
			title += ' / ' + workspaceTranslated;
		}
		return title;
	});
</script>

<svelte:head>
	<title>{title}</title>
	{#if env.PUBLIC_MATOMO_CONTAINER_ID}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
<UppyDashboardService />
