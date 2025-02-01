<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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

	export let container: Container;
	export let relatedContainers: Container[];

	$: parts = relatedContainers.filter(isObjectiveContainer).filter(isPartOf(container));

	function addItemURL(url: URL) {
		const params = paramsFromFragment(url);

		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadTypes.enum.objective],
			[predicates.enum['is-part-of'], String(container.revision)],
			[predicates.enum['is-objective-for'], String(container.revision)]
		]);

		return `#${newParams.toString()}`;
	}

	async function addObjective(target: Container) {
		const params = new URLSearchParams([
			[overlayKey.enum.create, payloadTypes.enum.indicator],
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
	<div>
		{#if parts.length > 0}
			<ul class="carousel">
				{#each parts as container}
					<li>
						<Card
							{container}
							relatedContainers={relatedContainers.filter(({ relation }) =>
								relation.some(({ object, subject }) =>
									[object, subject].includes(container.revision)
								)
							)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
		{#if $mayCreateContainer(payloadTypes.enum.objective, container.managed_by)}
			<a
				class="button"
				href={addItemURL($page.url)}
				on:click={(event) => {
					event.preventDefault();
					addObjective(container);
				}}
			>
				{$_('add_item')}
			</a>
		{/if}
	</div>
{/if}
