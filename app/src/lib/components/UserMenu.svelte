<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';
	import { cubicInOut } from 'svelte/easing';
	import { createMenu } from 'svelte-headlessui';
	import { slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ArrowRightToBracket from '~icons/flowbite/arrow-right-to-bracket-outline';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import Close from '~icons/flowbite/close-outline';
	import Cog from '~icons/knotdots/cog';
	import ProfileSettingsDialog from '$lib/components/ProfileSettingsDialog.svelte';
	import { user } from '$lib/stores';

	let dialog: HTMLDialogElement;

	const title = $_('user_menu');

	const menu = createMenu({ label: title });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	function onchange(event: Event) {
		const selected = (event as CustomEvent).detail.selected;

		if (selected === 'settings') {
			dialog.showModal();
		} else if (selected === 'logout') {
			signOut();
		}
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" {onchange} type="button" use:menu.button>
		<span class="avatar avatar-s">
			{$user.givenName.at(0)}{$user.familyName.at(0)}
		</span>
		<span class="truncated">
			{$user.givenName}
			{$user.familyName}
		</span>
		<ChevronDown />
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
				<button class="action-button" onclick={() => menu.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</div>
			<ul class="menu">
				<li
					class={['menu-item', ...($menu.active === 'settings' ? ['menu-item--active'] : [])]}
					use:menu.item={{ value: 'settings' }}
				>
					<button type="button">
						<Cog />
						<span class="truncated">{$_('profile.settings')}</span>
					</button>
				</li>
				<li
					class={[
						'menu-item',
						'menu-item--logout',
						...($menu.active === 'logout' ? ['menu-item--active'] : [])
					]}
					use:menu.item={{ value: 'logout' }}
				>
					<button type="button">
						<ArrowRightToBracket />
						<span class="truncated">{$_('logout')}</span>
					</button>
				</li>
			</ul>
		</div>
	{/if}
</div>

<ProfileSettingsDialog bind:dialog />

<style>
	.dropdown {
		display: flex;
		position: static;
		width: 100%;
	}

	.dropdown-button > :global(svg) {
		margin-left: auto;
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

	.menu {
		padding: 0.25rem;
		overflow-y: auto;
		width: 16rem;
	}

	.menu-item.menu-item--active > button {
		background-color: var(--color-gray-100);
	}

	.menu-item :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.menu-item.menu-item--logout > button {
		color: var(--color-red-600);
	}
</style>
