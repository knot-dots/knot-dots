<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Relation from '~icons/knotdots/relation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Card from '$lib/components/Card.svelte';
	import {
		getOrganizationURL,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import transformFileURL from '$lib/transformFileURL';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		button?: Snippet;
		container: OrganizationContainer | OrganizationalUnitContainer;
		linkPath?: string;
		showRelationFilter?: boolean;
	}

	let { button, container, linkPath = '/all/page', showRelationFilter = false }: Props = $props();

	let relatedTo = $derived(page.url.searchParams.get('related-to'));

	function toggleRelatedTo(params: URLSearchParams) {
		return async (event: Event) => {
			event.stopPropagation();

			const query = new URLSearchParams(params);
			if (relatedTo === container.guid) {
				query.delete('related-to');
			} else {
				query.delete('related-to');
				query.append('related-to', container.guid);
			}
			await goto(`?${query.toString()}`);
		};
	}

	function organizationURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		return () => {
			return getOrganizationURL(container, linkPath, env).toString();
		};
	}
</script>

{#snippet body()}
	{#if 'image' in container.payload && container.payload.image}
		<img alt={$_('image')} loading="lazy" src={transformFileURL(container.payload.image)} />
	{/if}
{/snippet}

{#snippet footer()}
	{#if 'organizationCategory' in container.payload && container.payload.organizationCategory}
		<span class="badge">
			{$_(container.payload.organizationCategory)}
		</span>
	{/if}
{/snippet}

{#if button}
	<Card {body} {button} {container} href={organizationURL(container)} {footer} />
{:else}
	<Card {body} {container} href={organizationURL(container)} {footer}>
		{#snippet button()}
			{#if showRelationFilter}
				<button
					class="button-relation button-relation--square"
					type="button"
					class:is-active={relatedTo === container.guid}
					onclick={toggleRelatedTo(page.url.searchParams)}
					{@attach tooltip($_('show_related_objects'))}
				>
					<Relation />
				</button>
			{/if}
		{/snippet}
	</Card>
{/if}

<style>
	img {
		max-height: 7rem;
		object-fit: contain;
	}
</style>
