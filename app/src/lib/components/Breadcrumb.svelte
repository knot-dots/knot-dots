<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Home from '~icons/flowbite/home-solid';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { getLastOverlayContext } from '$lib/contexts/lastOverlay';
	import { findAncestors, getOrganizationURL, paramsFromFragment, predicates } from '$lib/models';

	const superordinateOrganizationalUnits = $derived(
		page.data.currentOrganizationalUnit
			? findAncestors(page.data.currentOrganizationalUnit, page.data.organizationalUnits, [
					predicates.enum['is-part-of']
				]).toSorted((a, b) => a.payload.level - b.payload.level)
			: []
	);

	const lastOverlay = getLastOverlayContext();

	const itemFromLastOverlay = $derived.by(() => {
		if (!lastOverlay.url || !lastOverlay.pageTitle) {
			return;
		}

		let params = paramsFromFragment(lastOverlay.url);

		if (params.entries().some(([, v]) => v === page.params.contentGuid)) {
			return { href: lastOverlay.url.toString().split('#')[0], title: lastOverlay.pageTitle };
		}
	});

	const breadcrumb = $derived([
		{
			href: getOrganizationURL(page.data.currentOrganization, '', env).toString(),
			icon: Home,
			title: page.data.currentOrganization.payload.name
		},
		...(superordinateOrganizationalUnits.length > 0
			? [
					superordinateOrganizationalUnits.map((ou) => ({
						href: getOrganizationURL(ou, '/', env, {
							organizationSlug: page.data.currentOrganization.payload.slug,
							organizationCustomDomain: page.data.currentOrganization.payload.customDomain
						}).toString(),
						title: ou.payload.name
					}))
				]
			: []),
		...(page.data.currentOrganizationalUnit
			? [
					{
						href: getOrganizationURL(page.data.currentOrganizationalUnit, '/', env, {
							organizationSlug: page.data.currentOrganization.payload.slug,
							organizationCustomDomain: page.data.currentOrganization.payload.customDomain
						}).toString(),
						title: page.data.currentOrganizationalUnit.payload.name
					}
				]
			: []),
		...(page.data.container && page.data.container.guid != page.params.guid
			? [
					...(itemFromLastOverlay ? [itemFromLastOverlay] : []),
					{
						href: resolve('/[guid=uuid]/[contentGuid=uuid]', {
							guid: (page.data.currentOrganizationalUnit ?? page.data.currentOrganization).guid,
							contentGuid: page.data.container.guid
						}) as string,
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
					{#if Array.isArray(item)}
						{#if item.length > 0}
							<Dropdown label={$_('organizational_units')}>
								{#snippet button(popover)}
									<button class="dropdown-button" type="button" use:popover.button>…</button>
								{/snippet}

								{#snippet panel()}
									<ul>
										{#each item as { href, title } (href)}
											<li>
												<a class="truncated" {href}>{title}</a>
											</li>
										{/each}
									</ul>
								{/snippet}
							</Dropdown>
						{/if}
					{:else if (index < breadcrumb.length - 1 || index == 0) && item.href}
						<a class="truncated" href={item.href}>
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

	ol > li:first-child {
		flex-shrink: 0;
	}

	li {
		color: var(--color-text-accent-default);
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		min-width: 2rem;
	}

	ol > li:first-child::after,
	li:not(:last-child)::after {
		content: ' / ';
		display: inline-block;
		flex-shrink: 0;
		padding: 0.25rem;
	}

	li :global(svg) {
		color: var(--color-text-accent-strong);
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

	.dropdown-button {
		--dropdown-button-default-background: transparent;
		--dropdown-button-min-height: auto;
		--dropdown-button-padding: 0.25rem;

		font-size: inherit;
	}
</style>
