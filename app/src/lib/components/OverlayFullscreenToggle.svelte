<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Maximize from '~icons/flowbite/expand-outline';
	import Minimize from '~icons/flowbite/minimize-outline';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import { createFeatureDecisions } from '$lib/features';
	import {
		isMeasureContainer,
		isProgramContainer,
		isSimpleMeasureContainer,
		overlayKey,
		paramsFromFragment
	} from '$lib/models';
	import { overlay } from '$lib/stores';

	let fullScreen = getContext<{ enabled: boolean }>('overlayFullScreen');

	let href = $derived.by(() => {
		if (!$overlay?.container) {
			return '';
		}

		if (!createFeatureDecisions(page.data.features).useFullScreenRoutes()) {
			return '';
		}

		const routeParams = {
			guid: (page.data.currentOrganizationalUnit ?? page.data.currentOrganization).guid,
			contentGuid: $overlay.container.guid
		};

		switch ($overlay?.key) {
			case overlayKey.enum['chapters']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/all/level', routeParams);
			case overlayKey.enum['view']:
				return (
					resolve('/[guid=uuid]/[contentGuid=uuid]', routeParams) +
					(paramsFromFragment(page.url).has('table') ? '#table' : '')
				);
			case overlayKey.enum['goal-iooi']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/iooi/board', routeParams);
			case overlayKey.enum['measure-iooi']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/iooi/board', routeParams);
			case overlayKey.enum['indicators']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/indicators/catalog', routeParams);
			case overlayKey.enum['measure-monitoring']:
				if (isProgramContainer($overlay.container)) {
					return resolve('/[guid=uuid]/[contentGuid=uuid]/measures/monitoring', routeParams);
				} else if (
					isMeasureContainer($overlay.container) ||
					isSimpleMeasureContainer($overlay.container)
				) {
					return resolve('/[guid=uuid]/[contentGuid=uuid]/all/monitoring', routeParams);
				} else {
					return '';
				}
			case overlayKey.enum['measures']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/measures/status', routeParams);
			case overlayKey.enum['members']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/all/members', routeParams);
			case overlayKey.enum['tasks']:
				return resolve('/[guid=uuid]/[contentGuid=uuid]/tasks/status', routeParams);
			default:
				return '';
		}
	});
</script>

{#if href}
	<a {@attach tooltip($_('full_screen'))} class="action-button" {href}>
		<Maximize />
	</a>
{:else}
	<button
		class="action-button"
		onclick={() => (fullScreen.enabled = !fullScreen.enabled)}
		{@attach tooltip($_('full_screen'))}
	>
		{#if fullScreen.enabled}<Minimize />{:else}<Maximize />{/if}
	</button>
{/if}

<style>
	.action-button {
		flex-shrink: 0;
		margin-right: 0.5rem;
	}
</style>
