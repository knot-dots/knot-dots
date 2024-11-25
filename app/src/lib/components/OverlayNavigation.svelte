<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import ArrowRightOnRectangle from '~icons/heroicons/arrow-right-on-rectangle-20-solid';
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import Cog6Tooth from '~icons/heroicons/cog-6-tooth-20-solid';
	import Pencil from '~icons/heroicons/pencil-solid';
	import Share from '~icons/heroicons/share-20-solid';
	import XMark from '~icons/heroicons/x-mark-20-solid';
	import Effects from '~icons/knotdots/effects';
	import Measure from '~icons/knotdots/measure';
	import Members from '~icons/knotdots/members';
	import Objectives from '~icons/knotdots/objectives';
	import Tasks from '~icons/knotdots/tasks';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		type AnyContainer,
		boards,
		isIndicatorContainer,
		isMeasureContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment,
		payloadTypes
	} from '$lib/models';
	import { ability, applicationState, overlay, overlayHistory, user } from '$lib/stores';

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

	function toggleEditMode() {
		applicationState.update((state) => ({
			...state,
			containerDetailView: {
				...state.containerDetailView,
				editable: !state.containerDetailView.editable
			}
		}));
	}
</script>

<nav>
	<div>
		<a class="button button-nav button-square" href={closeURL($page.url)} title={$_('close')}>
			<XMark />
		</a>

		{#if $overlayHistory.length > 1}
			<button class="button-nav button-square" title={$_('back')} on:click={() => navigateBack()}>
				<ChevronLeft />
			</button>
		{/if}

		{#if container}
			<a
				class="button button-nav title"
				class:is-active={$overlay?.key === overlayKey.enum.view}
				href={overlayURL($page.url, overlayKey.enum.view, container.guid)}
			>
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					{container.payload.name}
				{:else}
					{container.payload.title}
				{/if}
			</a>
		{:else if $overlay?.key === overlayKey.enum.profile}
			<a
				class="button button-nav title"
				class:is-active={!paramsFromFragment($page.url).has(overlayKey.enum['my-tasks']) &&
					!paramsFromFragment($page.url).has(overlayKey.enum['my-settings'])}
				href={overlayURL($page.url, overlayKey.enum.profile, $user.guid)}
			>
				{$user.givenName}
				{$user.familyName}
			</a>
		{/if}
	</div>

	{#if container}
		<ul class="button-group button-group-nav">
			{#if !isStrategyContainer(container) && container.relation.length > 0}
				<li>
					<a
						class="button button-nav"
						class:is-active={$overlay?.key === overlayKey.enum.relations}
						href={overlayURL($page.url, overlayKey.enum.relations, container.guid)}
						title={$_('relations')}
					>
						<span class="small-only"><Share /></span>
						<span class="large-only">{$_('relations')}</span>
					</a>
				</li>
			{:else if isStrategyContainer(container) && container.relation.length > 0}
				<li>
					<a
						class="button button-nav"
						class:is-active={$overlay?.key === overlayKey.enum.chapters}
						href={overlayURL($page.url, overlayKey.enum.chapters, container.guid)}
						title={$_('board.chapters')}
					>
						<span class="small-only"><Share /></span>
						<span class="large-only">{$_('board.chapters')}</span>
					</a>
				</li>
				<li>
					<a
						class="button button-nav"
						class:is-active={$overlay?.key === overlayKey.enum.measures}
						href={overlayURL($page.url, overlayKey.enum.measures, container.guid)}
						title={$_('measures')}
					>
						<span class="small-only"><Measure /></span>
						<span class="large-only">{$_('measures')}</span>
					</a>
				</li>
			{/if}

			{#if isMeasureContainer(container) || isSimpleMeasureContainer(container) || isStrategyContainer(container)}
				<li>
					<a
						class="button button-nav"
						class:is-active={$overlay?.key === overlayKey.enum['measure-monitoring']}
						href={overlayURL($page.url, overlayKey.enum['measure-monitoring'], container.guid)}
						title={$_('board.measure_monitoring')}
					>
						<span class="small-only"><Objectives /></span>
						<span class="large-only">{$_('board.measure_monitoring')}</span>
					</a>
				</li>
			{/if}

			{#if isStrategyContainer(container) && $page.data.currentOrganization.payload.boards.includes(boards.enum['board.indicators'])}
				<li>
					<a
						class="button button-nav"
						class:is-active={$overlay?.key === overlayKey.enum.indicators}
						href={overlayURL($page.url, overlayKey.enum.indicators, container.guid)}
					>
						<span class="small-only"><Effects /></span>
						<span class="large-only">{$_('indicators')}</span>
					</a>
				</li>
			{/if}

			{#if isMeasureContainer(container) || isSimpleMeasureContainer(container)}
				<li>
					<a
						class="button button-nav"
						class:is-active={$overlay?.key === overlayKey.enum.tasks}
						href={overlayURL($page.url, overlayKey.enum.tasks, container.guid)}
						title={$_('tasks')}
					>
						<span class="small-only"><Tasks /></span>
						<span class="large-only">{$_('tasks')}</span>
					</a>
				</li>
			{/if}
		</ul>

		{#if (isIndicatorContainer(container) || isMeasureContainer(container) || isSimpleMeasureContainer(container) || isStrategyContainer(container)) && $ability.can('invite-members', container)}
			<a
				class="button button-nav"
				class:is-active={$overlay?.key === overlayKey.enum.members}
				href={overlayURL($page.url, overlayKey.enum.members, container.guid)}
				title={$_('team')}
			>
				<Members />
			</a>
		{/if}
	{:else if $overlay?.key === overlayKey.enum.profile}
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
					class:is-active={paramsFromFragment($page.url).has(overlayKey.enum['my-settings'])}
					href={`${overlayURL($page.url, overlayKey.enum['profile'], $user.guid)}&${
						overlayKey.enum['my-settings']
					}`}
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
		<button
			title={$_('edit_mode')}
			type="button"
			class="button-nav button-square"
			class:is-active={$applicationState.containerDetailView.editable}
			on:click={toggleEditMode}
		>
			<Pencil />
		</button>

		<a href={overlayURL($page.url, 'profile', $user.guid)}>
			<span
				class="avatar avatar-s button button-nav"
				class:is-active={$overlay?.key === overlayKey.enum.profile}
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
