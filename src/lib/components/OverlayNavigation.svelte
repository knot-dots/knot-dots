<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import Share from '~icons/heroicons/share-20-solid';
	import XMark from '~icons/heroicons/x-mark-20-solid';
	import Members from '~icons/knotdots/members';
	import Objectives from '~icons/knotdots/objectives';
	import Organization from '~icons/knotdots/organization';
	import Tasks from '~icons/knotdots/tasks';
	import { page } from '$app/stores';
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
	import { user } from '$lib/stores';

	export let container: AnyContainer;

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
						class:is-active={paramsFromURL($page.url).get(overlayKey.enum.tasks) === container.guid}
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
					class:is-active={paramsFromURL($page.url).get(overlayKey.enum.members) === container.guid}
					href={overlayURL($page.url, overlayKey.enum.members, container.guid)}
				>
					<span class="small-only"><Members /></span>
					<span class="large-only">{$_('members')}</span>
				</a>
			</li>
		{/if}
	</ul>

	{#if $user.isAuthenticated}
		<a href="/profile">
			<span
				class="avatar avatar-s button button-nav"
				class:is-active={$page.url.pathname === '/profile'}
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

	.button-group > li {
		flex-shrink: 0;
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
