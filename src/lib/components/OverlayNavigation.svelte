<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import ArrowRightOnRectangle from '~icons/heroicons/arrow-right-on-rectangle-20-solid';
	import Cog6Tooth from '~icons/heroicons/cog-6-tooth-20-solid';
	import Share from '~icons/heroicons/share-20-solid';
	import XMark from '~icons/heroicons/x-mark-20-solid';
	import Info from '~icons/knotdots/info';
	import Members from '~icons/knotdots/members';
	import Objectives from '~icons/knotdots/objectives';
	import Organization from '~icons/knotdots/organization';
	import Tasks from '~icons/knotdots/tasks';
	import { page } from '$app/stores';
	import { accountURL } from '$lib/authentication';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import {
		type AnyContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isOverlayKey,
		isStrategyContainer,
		type OverlayKey,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { overlay, user } from '$lib/stores';

	export let container: AnyContainer | undefined = undefined;

	function overlayURL(url: URL, key: OverlayKey, guid: string) {
		const hashParams = paramsFromURL(url);

		const newParams = new URLSearchParams([
			...Array.from(hashParams.entries()).filter(([k]) => !isOverlayKey(k)),
			[key, guid]
		]);

		return `#${newParams.toString()}`;
	}

	function closeURL(url: URL) {
		const hashParams = paramsFromURL(url);

		if (hashParams.has(overlayKey.enum['view-help'])) {
			const newParams = new URLSearchParams(
				[...hashParams.entries()].filter(([key]) => key != overlayKey.enum['view-help'])
			);
			return `#${newParams.toString()}`;
		} else {
			const newParams = new URLSearchParams(
				[...hashParams.entries()].filter(([key]) => key == overlayKey.enum.relate)
			);
			return `#${newParams.toString()}`;
		}
	}
</script>

<nav>
	<a class="button button-nav button-square" href={closeURL($page.url)}>
		<XMark />
	</a>

	{#if container}
		<a
			class="button button-nav title"
			class:is-active={paramsFromURL($page.url).get(overlayKey.enum.view) === container.guid}
			href={overlayURL($page.url, overlayKey.enum.view, container.guid)}
		>
			{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
				{container.payload.name}
			{:else}
				{container.payload.title}
			{/if}
		</a>

		<ul class="button-group button-group-nav">
			{#if !(isOrganizationalUnitContainer(container) || isOrganizationContainer(container)) && container.relation.length > 0}
				<li>
					<a
						class="button button-nav"
						class:is-active={paramsFromURL($page.url).get(overlayKey.enum.relations) ===
							container.guid}
						href={overlayURL($page.url, overlayKey.enum.relations, container.guid)}
					>
						<span class="small-only"><Share /></span>
						<span class="large-only">{$_('relations')}</span>
					</a>
				</li>
			{/if}

			{#if isMeasureContainer(container) || isOrganizationContainer(container) || isOrganizationalUnitContainer(container)}
				{#if container.payload.boards.includes('board.organizational_units')}
					<li>
						<a
							class="button button-nav"
							href="/{container.payload.type}/{container.guid}/organizational_units"
						>
							<span class="small-only"><Organization /></span>
							<span class="large-only">{$_('organizational_units')}</span>
						</a>
					</li>
				{/if}

				{#if container.payload.boards.includes('board.internal_objectives')}
					<li>
						<a
							class="button button-nav"
							class:is-active={paramsFromURL($page.url).get(
								overlayKey.enum['internal-objectives']
							) === container.guid}
							href={overlayURL($page.url, overlayKey.enum['internal-objectives'], container.guid)}
						>
							<span class="small-only"><Objectives /></span>
							<span class="large-only">{$_('internal_objective.label')}</span>
						</a>
					</li>
				{/if}

				{#if container.payload.boards.includes('board.tasks')}
					<li>
						<a
							class="button button-nav"
							class:is-active={paramsFromURL($page.url).get(overlayKey.enum.tasks) ===
								container.guid}
							href={overlayURL($page.url, overlayKey.enum.tasks, container.guid)}
						>
							<span class="small-only"><Tasks /></span>
							<span class="large-only">{$_('internal_objective.tasks')}</span>
						</a>
					</li>
				{/if}
			{/if}

			{#if isMeasureContainer(container) || isStrategyContainer(container) || isOrganizationContainer(container) || isOrganizationalUnitContainer(container)}
				<li>
					<a
						class="button button-nav"
						class:is-active={paramsFromURL($page.url).get(overlayKey.enum.members) ===
							container.guid}
						href={overlayURL($page.url, overlayKey.enum.members, container.guid)}
					>
						<span class="small-only"><Members /></span>
						<span class="large-only">{$_('members')}</span>
					</a>
				</li>
				<li>
					<button class="button-nav button-square" title={$_('logout')} on:click={() => signOut()}>
						<span class="small-only"><ArrowRightOnRectangle /></span>
						<span class="large-only">{$_('logout')}</span>
					</button>
				</li>
			{/if}
		</ul>
	{:else if paramsFromURL($page.url).has(overlayKey.enum.profile) && $overlay.organizations && $overlay.organizationalUnits}
		<a
			class="button button-nav title"
			class:is-active={$page.url.hash ===
				overlayURL($page.url, overlayKey.enum.profile, $user.guid)}
			href={overlayURL($page.url, overlayKey.enum.profile, $user.guid)}
		>
			{$user.givenName}
			{$user.familyName}
		</a>

		<ul class="button-group button-group-nav">
			<li>
				<a
					class="button button-nav"
					class:is-active={paramsFromURL($page.url).has(overlayKey.enum['my-tasks'])}
					href={`${overlayURL($page.url, overlayKey.enum.profile, $user.guid)}&${
						overlayKey.enum['my-tasks']
					}`}
					title={$_('profile.my_tasks')}
				>
					<span class="small-only"><Tasks /></span>
					<span class="large-only">{$_('profile.my_tasks')}</span>
				</a>
			</li>

			<li>
				<a
					class="button button-nav"
					href={accountURL($page.url.href)}
					title={$_('profile.settings')}
				>
					<span class="small-only"><Cog6Tooth /></span>
					<span class="large-only">{$_('profile.settings')}</span>
				</a>
			</li>

			<li>
				<button class="button-nav" title={$_('logout')} on:click={() => signOut()}>
					<span class="small-only"><ArrowRightOnRectangle /></span>
					<span class="large-only">{$_('logout')}</span>
				</button>
			</li>
		</ul>
	{/if}

	{#if $user.isAuthenticated}
		<a href={closeURL($page.url)}>
			<span
				class="avatar avatar-s button button-nav"
				class:is-active={paramsFromURL($page.url).get(overlayKey.enum.profile) === $user.guid}
			>
				{$user.givenName.at(0)}{$user.familyName.at(0)}
			</span>
		</a>
	{:else}
		<button class="button-nav fully-rounded" type="button" on:click={() => signIn('keycloak')}>
			{$_('login')}
		</button>
	{/if}
</nav>

<style>
	nav {
		align-items: center;
		container-type: inline-size;
		display: flex;
		flex-shrink: 0;
		font-size: 0.875rem;
		gap: 0.5rem;
		height: var(--nav-height);
		padding: 0 0.5rem;
	}

	nav > * {
		flex-shrink: 0;
	}

	nav > .title {
		display: inline-block;
		flex-shrink: 1;
		max-width: 25%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.button-group {
		flex-shrink: 1;
		margin: 0 auto;
		overflow-x: auto;
	}

	.large-only {
		display: none;
	}

	@container (min-inline-size: 50rem) {
		.large-only {
			display: inherit;
		}

		.small-only {
			display: none;
		}
	}
</style>
