<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Overlay from '~icons/knotdots/overlay';
	import { page } from '$app/state';
	import { getLastOverlayContext } from '$lib/contexts/lastOverlay';
	import { paramsFromFragment } from '$lib/models';

	let lastOverlay = getLastOverlayContext();

	let url = $derived.by(() => {
		if (!lastOverlay.url) {
			return;
		}

		let params = paramsFromFragment(lastOverlay.url);

		if (params.entries().find(([, v]) => v === page.params.contentGuid)) {
			return lastOverlay.url;
		}
	});

	$effect(() => {
		if (!url) {
			lastOverlay.url = undefined;
		}
	});
</script>

{#if url}
	<a class="button" href={url.href} type="button">
		<Overlay />
		<span class="is-visually-hidden">{$_('back_to_overlay')}</span>
	</a>
{/if}

<style>
	a {
		--button-background: var(--color-gray-050);

		align-items: center;
		border: none;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-900);
		display: none;
		font-weight: 500;
		height: 2.25rem;
		padding: 0.5rem 0.75rem;
		margin-left: auto;
		white-space: nowrap;
	}

	a > :global(svg) {
		max-width: none;
	}

	@container (min-width: 30rem) {
		a {
			display: inline-flex;
		}
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden {
				all: revert-layer;
			}
		}
	}
</style>
