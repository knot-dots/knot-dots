<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dots from '~icons/knotdots/dots';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import { getVisibleWorkspaces } from '$lib/workspaces';

	let context = $derived(page.data.currentOrganizationalUnit ?? page.data.currentOrganization);

	let visible = $derived(
		getVisibleWorkspaces({
			organization: page.data.currentOrganization,
			organizationalUnit: page.data.currentOrganizationalUnit,
			features: createFeatureDecisions(page.data.features)
		}).findIndex(({ key }) => key == 'overview') > -1
	);
</script>

{#if visible && !page.params.contentGuid}
	<a class="button" href={resolve('/[guid=uuid]/all/level', { guid: context.guid })}>
		<Dots />
		<span class="is-visually-hidden">{$_('dots')}</span>
	</a>
{:else}
	<span class="spacer"></span>
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
	}

	a > :global(svg) {
		max-width: none;
	}

	.spacer {
		margin-left: auto;
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
