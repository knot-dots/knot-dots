<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import type { DndEvent } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import saveTaskPriority from '$lib/client/saveTaskPriority';
	import Card from '$lib/components/Card.svelte';
	import saveContainer from '$lib/client/saveContainer';
	import { containerOfType, payloadTypes } from '$lib/models';
	import type { TaskContainer, TaskStatus } from '$lib/models';
	import { ability } from '$lib/stores';

	export let addItemUrl: string | undefined = undefined;
	export let items: TaskContainer[] = [];
	export let status: TaskStatus;

	function handleDndConsider(e: CustomEvent<DndEvent<TaskContainer>>) {
		items = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<DndEvent<TaskContainer>>) {
		items = e.detail.items;
		if (e.detail.info.trigger == 'droppedIntoZone') {
			const droppedItem = items.find(({ guid }) => guid == e.detail.info.id);

			if (droppedItem && droppedItem.payload.taskStatus != status) {
				droppedItem.payload.taskStatus = status;
				saveContainer(droppedItem).catch((reason) => console.log(reason));
			}

			saveTaskPriority(items.map(({ guid }, index) => ({ priority: index, task: guid }))).catch(
				(reason) => console.log(reason)
			);
		}
	}

	function containerOfTypeTask() {
		return containerOfType(
			payloadTypes.enum.task,
			$page.data.currentOrganization.guid,
			$page.data.currentOrganizationalUnit?.guid ?? null,
			env.PUBLIC_KC_REALM
		);
	}
</script>

<section>
	<header>
		<h2>
			{$_(status)}
		</h2>
		{#if addItemUrl && $ability.can('create', containerOfTypeTask())}
			<a href={addItemUrl} title={$_('add_item')}><PlusSmall /></a>
		{/if}
	</header>
	{#if $ability.can('prioritize', containerOfTypeTask())}
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
	{#if addItemUrl && $ability.can('create', containerOfTypeTask())}
		<footer>
			<a href={addItemUrl}>
				{$_('add_item')}
				<PlusSmall />
			</a>
		</footer>
	{/if}
</section>

<style>
	section {
		background: var(--background, var(--gradient-first-column));
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
		border-color: var(--hover-border-color, var(--color-hover-neutral));
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
