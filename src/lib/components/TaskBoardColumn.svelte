<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import type { DndEvent } from 'svelte-dnd-action';
	import { Icon, PlusSmall } from 'svelte-hero-icons';
	import type { IconSource } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import Card from '$lib/components/Card.svelte';
	import saveContainer from '$lib/client/saveContainer';
	import type { TaskContainer, TaskStatus } from '$lib/models';
	import { user } from '$lib/stores';
	import { getContext } from 'svelte';
	import saveTaskPriority from '$lib/client/saveTaskPriority.js';

	export let addItemUrl: string;
	export let icon: IconSource | undefined = undefined;
	export let items: TaskContainer[] = [];
	export let status: TaskStatus;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	function handleDndConsider(e: CustomEvent<DndEvent<TaskContainer>>) {
		items = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<DndEvent<TaskContainer>>) {
		items = e.detail.items;
		if (e.detail.info.trigger == 'droppedIntoZone') {
			const droppedItem = items.find(({ guid }) => guid == e.detail.info.id);

			if (droppedItem && droppedItem.payload.taskStatus != status) {
				droppedItem.payload.taskStatus = status;
				saveContainer(getKeycloak(), droppedItem).catch((reason) => console.log(reason));
			}

			saveTaskPriority(
				getKeycloak(),
				items.map(({ revision }, index) => ({ priority: index, task: revision }))
			).catch((reason) => console.log(reason));
		}
	}
</script>

<section>
	<header>
		<h2>
			{$_(status)}
			{#if icon}
				<Icon src={icon} size="16" mini />
			{/if}
		</h2>
		{#if $user.isAuthenticated}
			<a href={addItemUrl} title={$_('add_item')}><Icon src={PlusSmall} size="20" /></a>
		{/if}
	</header>
	{#if $user.isAuthenticated}
		<div
			class="vertical-scroll-wrapper masked-overflow"
			use:dndzone={{ items }}
			on:consider={handleDndConsider}
			on:finalize={handleDndFinalize}
		>
			{#each items as container (container.guid)}
				<Card {container} />
			{/each}
		</div>
	{:else}
		<div class="vertical-scroll-wrapper masked-overflow">
			{#each items as container (container.guid)}
				<Card {container} />
			{/each}
		</div>
	{/if}
	{#if $user.isAuthenticated}
		<footer>
			<a href={addItemUrl}>
				{$_('add_item')}
				<Icon src={PlusSmall} size="24" mini />
			</a>
		</footer>
	{/if}
</section>

<style>
	section {
		background-color: var(--bg-color, var(--color-indigo-050));
		border-radius: 8px;
		display: flex;
		flex-basis: 20.75rem;
		flex-direction: column;
		flex-grow: 0;
		flex-shrink: 0;
		padding: 0.625rem;
	}

	header {
		align-items: center;
		color: var(--color-gray-800);
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.625rem 0;
	}

	header h2 {
		align-items: baseline;
		display: flex;
		font-size: inherit;
		font-weight: 700;
		gap: 0.5rem;
	}

	:global(header svg) {
		stroke-width: 2.5px;
	}

	footer {
		background-color: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		flex-shrink: 0;
		overflow: hidden;
	}

	footer:hover {
		background-color: var(--color-gray-200);
	}

	footer a {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		padding: 10px 20px;
		text-align: center;
		width: 100%;
	}
</style>
