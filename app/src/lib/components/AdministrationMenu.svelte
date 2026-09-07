<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { createMenu } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import Close from '~icons/knotdots/close';
	import Cog from '~icons/knotdots/cog';
	import Template from '~icons/knotdots/template';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import OrganizationalUnitProperties from '$lib/components/OrganizationalUnitProperties.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import {
		type Container,
		getOrganizationURL,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		type OrganizationalUnitPayload,
		type OrganizationPayload
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<OrganizationPayload | OrganizationalUnitPayload>;
	}

	let { container: originalContainer }: Props = $props();

	let container = $derived.by(() => {
		let _ = $state(originalContainer);
		return _;
	});

	// svelte-ignore non_reactive_update
	let propertiesDialog: HTMLDialogElement;

	const menu = createMenu({ label: $_('administration') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset: [0, -4] } }]
	});

	const handleSubmit = $derived(autoSave(container, 2000));

	function onchange(event: Event) {
		const selected = (event as CustomEvent).detail.selected;

		if (selected && typeof selected === 'function') {
			selected();
		} else if (selected && typeof selected === 'string') {
			goto(selected);
		}
	}

	function showPropertiesDialog() {
		propertiesDialog.showModal();
	}
</script>

<div class="dropdown">
	<button class="dropdown-button" {onchange} type="button" use:menu.button use:popperRef>
		<Cog />
		{$_('administration')}
	</button>

	{#if $menu.expanded}
		<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
			<p class="dropdown-panel-title">
				<span>{$_('administration')}</span>
				<button class="action-button" onclick={() => menu.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</p>

			<ul class="menu">
				{#if $ability.can('update', container)}
					<li role="none">
						<button
							class={[
								'menu-item',
								...($menu.active === showPropertiesDialog ? ['menu-item--active'] : [])
							]}
							type="button"
							use:menu.item={{ value: showPropertiesDialog }}
						>
							<Cog />{$_('configuration')}
						</button>
					</li>

					<li role="none">
						{const templatesURl = getOrganizationURL(container, '/templates', env, {
							organizationSlug: page.data.currentOrganization.payload.slug,
							organizationCustomDomain: page.data.currentOrganization.payload.customDomain
						}).toString()}
						<a
							class={['menu-item', ...($menu.active === templatesURl ? ['menu-item--active'] : [])]}
							href={templatesURl}
							use:menu.item={{ value: templatesURl }}
						>
							<Template />
							{$_('workspace.templates.title')}
						</a>
					</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>

<PropertiesDialog
	bind:dialog={propertiesDialog}
	{container}
	relatedContainers={[]}
	title={$_('configuration_name', { values: { name: container.payload.name } })}
>
	<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
		{#if isOrganizationContainer(container)}
			<OrganizationProperties bind:container editable={$ability.can('update', container)} />
		{:else if isOrganizationalUnitContainer(container)}
			<OrganizationalUnitProperties bind:container editable={$ability.can('update', container)} />
		{/if}
	</form>
</PropertiesDialog>

<style>
	form {
		display: contents;
	}

	.dropdown {
		--dropdown-button-border-radius: 8px;
		--dropdown-button-default-color: var(--color-text-default);
		--dropdown-button-default-background: transparent;
		--dropdown-button-icon-default-color: var(--color-icon-subtle);
		--dropdown-button-padding: 0.25rem 0.25rem 0.25rem 0.5rem;
		--dropdown-panel-border-radius: 16px;
		--dropdown-panel-width: 15rem;
	}

	.dropdown-button {
		gap: 0.375rem;
		justify-content: flex-start;
	}

	.dropdown-button:global([aria-expanded='true']) {
		color: var(--color-text-strong);
	}

	.dropdown-panel {
		gap: 0;
	}

	.dropdown-panel-title {
		align-items: center;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		justify-content: space-between;
		padding: 0 0 0 0.5rem;
	}

	.menu {
		gap: 0;
	}

	.menu-item {
		align-items: center;
		border: none;
		border-radius: 8px;
		color: var(--color-text-default);
		cursor: default;
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.375rem;
		padding: 0.5rem;
		width: 100%;
	}

	.menu-item.menu-item--active {
		background-color: var(--color-gray-100);
	}

	.menu-item :global(svg) {
		color: var(--color-icon-accent-default);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}
</style>
