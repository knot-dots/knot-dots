<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import ArrowRightOnRectangle from '~icons/heroicons/arrow-right-on-rectangle-20-solid';
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import Cog6Tooth from '~icons/heroicons/cog-6-tooth-20-solid';
	import Share from '~icons/heroicons/share-20-solid';
	import XMark from '~icons/heroicons/x-mark-20-solid';
	import Effects from '~icons/knotdots/effects';
	import Members from '~icons/knotdots/members';
	import Objectives from '~icons/knotdots/objectives';
	import Tasks from '~icons/knotdots/tasks';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { accountURL } from '$lib/authentication';
	import {
		type AnyContainer,
		boards,
		isMeasureContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment,
		payloadTypes
	} from '$lib/models';
	import { ability, overlay, overlayHistory, user } from '$lib/stores';

	export let container: AnyContainer | undefined = undefined;

	async function navigateBack() {
		$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
		const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
		await goto(`#${newParams.toString()}`);
	}

	function closeURL(url: URL) {
		const closeURL = new URL(url);
		closeURL.hash = '';
		return closeURL.toString();
	}
</script>

<nav>
	<div>
		<a class="button button-nav button-square" href={closeURL($page.url)} title={$_('close')}>
			<XMark />
		</a>

		{#if $overlayHistory.length > 1}
			<button class="button-nav button-square" on:click={() => navigateBack()}>
				<ChevronLeft />
			</button>
		{/if}

		{#if container}
			<a
				class="button button-nav title"
				class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.view) === container.guid}
				href={overlayURL($page.url, overlayKey.enum.view, container.guid)}
			>
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					{container.payload.name}
				{:else}
					{container.payload.title}
				{/if}
			</a>
		{:else if paramsFromFragment($page.url).has(overlayKey.enum.profile) && $overlay.organizations && $overlay.organizationalUnits}
			<a
				class="button button-nav title"
				class:is-active={$page.url.hash ===
					overlayURL($page.url, overlayKey.enum.profile, $user.guid)}
				href={overlayURL($page.url, overlayKey.enum.profile, $user.guid)}
			>
				{$user.givenName}
				{$user.familyName}
			</a>
		{/if}
	</div>

	{#if container}
		<ul class="button-group button-group-nav">
			{#if container.relation.length > 0}
				<li>
					<a
						class="button button-nav"
						class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.relations) ===
							container.guid}
						href={overlayURL($page.url, overlayKey.enum.relations, container.guid)}
					>
						<span class="small-only"><Share /></span>
						<span class="large-only">{$_('relations')}</span>
					</a>
				</li>
			{/if}

			{#if isMeasureContainer(container)}
				{#if container.payload.boards.includes('board.internal_objectives')}
					<li>
						<a
							class="button button-nav"
							class:is-active={paramsFromFragment($page.url).get(
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
							class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.tasks) ===
								container.guid}
							href={overlayURL($page.url, overlayKey.enum.tasks, container.guid)}
						>
							<span class="small-only"><Tasks /></span>
							<span class="large-only">{$_('tasks')}</span>
						</a>
					</li>
				{/if}
			{:else if isStrategyContainer(container) && $page.data.currentOrganization.payload.boards.includes(boards.enum['board.indicators'])}
				<li>
					<a
						class="button button-nav"
						class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.indicators) ===
							container.guid}
						href={overlayURL($page.url, overlayKey.enum.indicators, container.guid)}
					>
						<span class="small-only"><Effects /></span>
						<span class="large-only">{$_('indicators')}</span>
					</a>
				</li>
			{/if}
		</ul>

		{#if (isMeasureContainer(container) || isSimpleMeasureContainer(container) || isStrategyContainer(container)) && $ability.can('update', container)}
			<a
				class="button button-nav"
				class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.members) ===
					container.guid}
				href={overlayURL($page.url, overlayKey.enum.members, container.guid)}
				title={$_('members')}
			>
				<Members />
			</a>
		{/if}
	{:else if paramsFromFragment($page.url).has(overlayKey.enum.profile) && $overlay.organizations && $overlay.organizationalUnits}
		<ul class="button-group button-group-nav">
			<li>
				<a
					class="button button-nav"
					class:is-active={paramsFromFragment($page.url).has(overlayKey.enum['my-tasks'])}
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
		<a href={overlayURL($page.url, 'profile', $user.guid)}>
			<span
				class="avatar avatar-s button button-nav"
				class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.profile) === $user.guid}
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
		justify-content: space-between;
		padding: 0 0.5rem;
	}

	nav > * {
		flex-shrink: 0;
	}

	nav > div {
		display: flex;
		gap: 0.5rem;
		max-width: calc(25% + 3.5rem);
	}

	.button.button-nav.title {
		display: inline-block;
		flex-shrink: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.button-nav {
		flex-shrink: 0;
	}

	.button-group {
		flex-shrink: 1;
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
