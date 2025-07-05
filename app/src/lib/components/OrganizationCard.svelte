<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Relation from '~icons/knotdots/relation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Card from '$lib/components/Card.svelte';
	import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
	import type { Snippet } from 'svelte';

	interface Props {
		button?: Snippet;
		container: OrganizationContainer | OrganizationalUnitContainer;
		linkPath?: string;
		showRelationFilter?: boolean;
	}

	let { button, container, linkPath = '/', showRelationFilter = false }: Props = $props();

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
			const url = new URL(env.PUBLIC_BASE_URL ?? '');
			url.hostname = `${container.guid}.${url.hostname}`;
			url.pathname = linkPath
				.replace('/me/measures', '/measures/status')
				.replace('/me/tasks', '/tasks/status')
				.replace('/me', '/all/page');
			return url.toString();
		};
	}
</script>

{#snippet body()}
	{#if 'image' in container.payload}
		<img alt={$_('image')} src={container.payload.image} />
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
					aria-label={$_('show_related_objects')}
					type="button"
					class:is-active={relatedTo === container.guid}
					onclick={toggleRelatedTo(page.url.searchParams)}
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
