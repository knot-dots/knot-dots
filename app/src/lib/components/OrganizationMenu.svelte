<script lang="ts">
	import { getContext } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Close from '~icons/flowbite/close-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import ChevronSort from '~icons/knotdots/chevron-sort';
	import Plus from '~icons/knotdots/plus';
	import Relation from '~icons/knotdots/relation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { createFeatureDecisions } from '$lib/features';
	import {
		containerOfType,
		getOrganizationURL,
		type NewContainer,
		type OrganizationContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import { getVisibleWorkspaces } from '$lib/workspaces';

	interface Props {
		defaultOrganization?: OrganizationContainer;
		options: OrganizationContainer[];
		selected: OrganizationContainer;
	}

	let { defaultOrganization, options, selected }: Props = $props();

	const title = $_('organizations');

	const menu = createMenu({ label: title });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [
			{ name: 'offset', options: { offset: [0, 4] } },
			{
				name: 'preventOverflow',
				options: { altAxis: true, boundary: 'clippingParents', padding: 8 }
			}
		]
	};

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	let canCreateOrganization = $derived(
		$mayCreateContainer(payloadTypes.enum.organization, page.data.currentOrganization.guid)
	);

	function handleCreateOrganization() {
		const container = containerOfType(
			payloadTypes.enum.organization,
			page.data.currentOrganization.guid,
			null,
			page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		$newContainer = container;
		createContainerDialog.getElement().showModal();
	}

	function pathnameWithoutContextSegment() {
		const pathnameSegments = page.url.pathname.split('/');
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (pathnameSegments.length > 1 && uuidRegex.test(pathnameSegments[1])) {
			return [pathnameSegments.slice(0, 1), ...pathnameSegments.slice(2)].join('/');
		} else {
			return page.url.pathname;
		}
	}

	function linkPathForContainer(container: OrganizationContainer) {
		const pathname = pathnameWithoutContextSegment();
		const workspacePaths = getVisibleWorkspaces({
			organization: container,
			organizationalUnit: null,
			features: createFeatureDecisions(page.data.features)
		}).flatMap((w) => Object.values(w.views));

		return workspacePaths.some((w) => w.endsWith(pathname)) ? pathname : '/all/page';
	}

	function optionURL(container: OrganizationContainer) {
		return getOrganizationURL(container, linkPathForContainer(container), env).toString();
	}

	function onchange(event: Event) {
		const selected = (event as CustomEvent).detail.selected;

		if (selected) {
			window.location.href = selected;
		}
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" {onchange} type="button" use:menu.button>
		<span class="truncated">{selected.payload.name}</span>
		<ChevronSort />
	</button>

	{#if $menu.expanded}
		<div
			class="dropdown-panel"
			transition:slide={{ duration: 125, easing: cubicInOut }}
			use:menu.items
			use:popperContent={extraOpts}
		>
			<div class="dropdown-panel-title">
				<span>{title}</span>
				{#if canCreateOrganization}
					<button class="action-button" onclick={handleCreateOrganization} type="button">
						<Plus />
						<span class="is-visually-hidden">{$_('organization.create')}</span>
					</button>
				{/if}
				<button class="action-button" onclick={() => menu.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</div>
			<ul class="menu">
				{#each options as option (option.guid)}
					{@const value = optionURL(option)}
					{@const active = $menu.active === value}
					<li
						class={['menu-item', ...(active ? ['menu-item--active'] : [])]}
						use:menu.item={{ value }}
					>
						<a
							class="button"
							data-sveltekit-preload-code="tap"
							data-sveltekit-preload-data="tap"
							href={value}
						>
							<span class="truncated">
								{option.payload.name}
							</span>
						</a>
					</li>
				{/each}
			</ul>
			{#if defaultOrganization}
				<a
					class="dropdown-button dropdown-button--footer"
					data-sveltekit-preload-code="tap"
					data-sveltekit-preload-data="tap"
					href={optionURL(defaultOrganization)}
				>
					<Relation />
					<span>{defaultOrganization.payload.name}</span>
					<ChevronRight />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		display: flex;
		position: static;
		width: 100%;
	}

	.dropdown-panel-title {
		align-items: center;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.25rem 0 0.75rem;
	}

	.dropdown-panel-title > span {
		margin-right: auto;
	}

	.dropdown-button--footer {
		--dropdown-button-border-radius: 0;
		--dropdown-button-box-shadow: none;
		--dropdown-button-default-background: var(--color-gray-050);
		--dropdown-button-padding: 0.5rem 0.75rem;

		border-top: 1px solid var(--color-gray-200);
		flex-shrink: 0;
		gap: 0.5rem;
		height: 2.375rem;
	}

	.dropdown-button--footer > span {
		margin-right: auto;
	}

	.menu {
		padding: 0 0.25rem;
		overflow-y: auto;
		width: 22.5rem;
	}

	.menu-item.menu-item--active > a {
		background-color: var(--color-gray-100);
	}
</style>
