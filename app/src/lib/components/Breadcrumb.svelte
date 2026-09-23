<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Home from '~icons/flowbite/home-solid';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { getOrganizationURL } from '$lib/models';
	import { isPartOf } from '$lib/relations';

	const superordinateOrganizationalUnit = $derived(
		page.data.currentOrganizationalUnit
			? isPartOf(page.data.currentOrganizationalUnit, page.data.organizationalUnits)
			: undefined
	);

	const breadcrumb = $derived([
		...(page.route.id != '/[guid=uuid]' || page.params.guid != page.data.currentOrganization.guid
			? [
					{
						href: getOrganizationURL(page.data.currentOrganization, '/', env),
						icon: Home,
						title: page.data.currentOrganization.payload.name
					}
				]
			: []),
		...(superordinateOrganizationalUnit ? [{ title: '…' }] : []),
		...(page.data.currentOrganizationalUnit
			? [
					{
						href: getOrganizationURL(page.data.currentOrganizationalUnit, '/', env, {
							organizationSlug: page.data.currentOrganization.payload.slug,
							organizationCustomDomain: page.data.currentOrganization.payload.customDomain
						}),
						title: page.data.currentOrganizationalUnit.payload.name
					}
				]
			: []),
		...(page.data.container && page.data.container.guid != page.params.guid
			? [
					{
						href: resolve('/[guid=uuid]/[contentGuid=uuid]', {
							guid: (page.data.currentOrganizationalUnit ?? page.data.currentOrganization).guid,
							contentGuid: page.data.container.guid
						}),
						title: page.data.container.payload.title
					}
				]
			: []),
		...(page.route.id != '/[guid=uuid]' && page.route.id != '/[guid=uuid]/[contentGuid=uuid]'
			? [
					{
						title: page.data.title
					}
				]
			: [])
	]);
</script>

{#if breadcrumb.length > 0}
	<nav aria-label={$_('breadcrumb')}>
		<ol>
			{#each breadcrumb as item, index (index)}
				<li>
					{#if (index < breadcrumb.length - 1 || index == 0) && item.href}
						<a class="truncated" href={item.href.toString()}>
							{#if item.icon}
								<item.icon />
								<span class="is-visually-hidden">{item.title}</span>
							{:else}
								{item.title}
							{/if}
						</a>
					{:else}
						<span class="truncated">
							{item.title}
						</span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}

<style>
	nav {
		min-width: 0;
	}

	ol {
		align-items: center;
		display: flex;
		height: 2rem;
	}

	li {
		color: var(--color-text-accent-default);
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		min-width: 2rem;
	}

	li:first-child {
		color: var(--color-text-accent-strong);
		flex-shrink: 0;
	}

	li:first-child::after,
	li:not(:last-child)::after {
		content: ' / ';
		display: inline-block;
		flex-shrink: 0;
		padding: 0.25rem;
	}

	li :global(svg) {
		display: inline-block;
		height: 1rem;
		max-width: none;
		vertical-align: text-bottom;
		width: 1rem;
	}

	li > a {
		border-radius: 8px;
		padding: 0.25rem;
	}

	li > span {
		padding: 0.25rem;
	}

	li > a:active,
	li > a:hover {
		background-color: var(--color-background-accent-hover);
	}
</style>
