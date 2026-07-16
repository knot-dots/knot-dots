<script lang="ts">
	import { type Snippet } from 'svelte';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import saveContainer from '$lib/client/saveContainer';
	import saveTaskPriority from '$lib/client/saveTaskPriority';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		containerOfType,
		payloadTypes,
		type Status,
		type TaskPayload
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		addItemUrl?: string;
		itemSnippet: Snippet<[Container<TaskPayload>]>;
		items: Container<TaskPayload>[];
		onSort?: (items: Container<TaskPayload>[]) => void;
		status: Status;
	}

	let { addItemUrl, onSort, itemSnippet, items = [], status }: Props = $props();

	function containerOfTypeTask() {
		return containerOfType(
			payloadTypes.enum.task,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			[page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid],
			env.PUBLIC_KC_REALM
		);
	}

	function handleDndConsider(e: CustomEvent<DndEvent<Container<TaskPayload>>>) {
		items = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<DndEvent<Container<TaskPayload>>>) {
		items = e.detail.items;
		if (e.detail.info.trigger == 'droppedIntoZone') {
			const droppedItem = items.find(({ guid }) => guid == e.detail.info.id);

			if (droppedItem && droppedItem.payload.status != status) {
				droppedItem.payload.status = status;
				const response = await saveContainer(droppedItem, false);

				if (response.ok) {
					const updatedContainer = await response.json();
					droppedItem.revision = updatedContainer.revision;
				} else {
					const error = await response.json();
					alert(error.message);
				}
			}

			const priorityResponse = await saveTaskPriority(
				items.map(({ guid }, index) => ({ priority: index, task: guid }))
			);
			if (priorityResponse.ok) {
				onSort?.(items);
			} else {
				const error = await priorityResponse.json();
				alert(error.message);
			}
		}
	}
</script>

<BoardColumn {addItemUrl} title={$_(status)}>
	{#if browser && !matchMedia('(pointer: coarse)').matches && $ability.can('prioritize', containerOfTypeTask())}
		<div
			class="vertical-scroll-wrapper"
			use:dndzone={{ dropTargetStyle: {}, items }}
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
		<div class="vertical-scroll-wrapper">
			{#each items as container (container.guid)}
				{#if itemSnippet}
					{@render itemSnippet(container)}
				{:else}
					<Card {container} />
				{/if}
			{/each}
		</div>
	{/if}
</BoardColumn>
