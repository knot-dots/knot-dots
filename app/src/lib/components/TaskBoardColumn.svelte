<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import saveContainer from '$lib/client/saveContainer';
	import saveTaskPriority from '$lib/client/saveTaskPriority';
	import Card from '$lib/components/Card.svelte';
	import {
		containerOfType,
		isTaskContainer,
		type NewContainer,
		type PartialRelation,
		payloadTypes,
		predicates,
		type TaskContainer,
		type TaskStatus
	} from '$lib/models';
	import { ability, newContainer } from '$lib/stores';

	interface Props {
		addItemUrl?: string;
		itemSnippet: Snippet<[TaskContainer]>;
		items: TaskContainer[];
		status: TaskStatus;
	}

	let { addItemUrl, itemSnippet, items = [], status }: Props = $props();

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
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM
		);
	}

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer(event: Event) {
		event.preventDefault();

		const params = new URLSearchParams(
			(event.currentTarget as HTMLAnchorElement).hash.substring(1)
		);

		const container = containerOfTypeTask() as NewContainer;

		if (params.has('taskStatus') && isTaskContainer(container)) {
			container.payload.taskStatus = params.get('taskStatus') as TaskStatus;
		}

		container.relation = [
			...params.getAll(predicates.enum['is-part-of']).map(
				(o): PartialRelation => ({
					object: o,
					position: 0,
					predicate: predicates.enum['is-part-of']
				})
			),
			...params.getAll(predicates.enum['is-part-of-measure']).map(
				(o): PartialRelation => ({
					object: o,
					position: 0,
					predicate: predicates.enum['is-part-of-measure']
				})
			)
		];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}
</script>

<section>
	<header>
		<h2>
			{$_(status)}
		</h2>
		{#if addItemUrl}
			<a href={addItemUrl} onclick={createContainer} title={$_('add_item')}><Plus /></a>
		{/if}
	</header>
	{#if browser && !matchMedia('(pointer: coarse)').matches && $ability.can('prioritize', containerOfTypeTask())}
		<div
			class="vertical-scroll-wrapper masked-overflow"
			use:dndzone={{ items }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
		>
			{#each items as container (container.guid)}
				{#if itemSnippet}
					{@render itemSnippet(container)}
				{:else}
					<Card {container} />
				{/if}
			{/each}
		</div>
	{:else}
		<div class="vertical-scroll-wrapper masked-overflow">
			{#each items as container (container.guid)}
				{#if itemSnippet}
					{@render itemSnippet(container)}
				{:else}
					<Card {container} />
				{/if}
			{/each}
		</div>
	{/if}
	{#if addItemUrl}
		<footer>
			<a href={addItemUrl} onclick={createContainer}>{$_('add_item')}<Plus /></a>
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
		margin-top: auto;
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
