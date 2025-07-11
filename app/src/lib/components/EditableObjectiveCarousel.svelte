<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/heroicons/plus-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		isObjectiveContainer,
		isOverlayKey,
		isPartOf,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { addObjectiveState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: Container;
		editable?: boolean;
		relatedContainers: Container[];
	}

	let { container, editable = false, relatedContainers }: Props = $props();

	let parts = $derived(relatedContainers.filter(isObjectiveContainer).filter(isPartOf(container)));

	function addItemURL(url: URL) {
		const params = paramsFromFragment(url);

		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadTypes.enum.objective],
			[predicates.enum['is-part-of'], container.guid],
			[predicates.enum['is-objective-for'], container.guid]
		]);

		return `#${newParams.toString()}`;
	}

	async function addObjective(target: Container) {
		const params = new URLSearchParams([
			[overlayKey.enum['indicator-catalog'], ''],
			['alreadyInUse', '']
		]);

		if ('category' in container.payload) {
			for (const category of container.payload.category) {
				params.append('category', category);
			}
		}

		if ('topic' in container.payload) {
			for (const topic of container.payload.topic) {
				params.append('topic', topic);
			}
		}

		$addObjectiveState = { target };

		await goto(`#${params.toString()}`);
	}
</script>

{#if parts.length > 0 || $mayCreateContainer(payloadTypes.enum.objective, container.managed_by)}
	<ul class="carousel" class:editable>
		{#each parts as container}
			<li>
				<Card
					{container}
					relatedContainers={relatedContainers.filter(({ relation }) =>
						relation.some(({ object, subject }) => [object, subject].includes(container.guid))
					)}
				/>
			</li>
		{/each}
		{#if $mayCreateContainer(payloadTypes.enum.objective, container.managed_by) && editable}
			<li>
				<a
					class="card"
					href={addItemURL(page.url)}
					title={$_('add_item')}
					onclick={(event) => {
						event.preventDefault();
						addObjective(container);
					}}
				>
					<Plus />
				</a>
			</li>
		{/if}
	</ul>
{/if}

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		grid-row: 1 / 4;
		min-height: 6rem;
		justify-content: center;
	}

	.card :global(svg) {
		height: 4rem;
		width: 4rem;
	}
</style>
