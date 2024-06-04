<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		isOverlayKey,
		type MilestoneContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: Container;

	$: containerRequest = fetchRelatedContainers(container.guid, {
		payloadType: [payloadTypes.enum.milestone]
	}) as Promise<Array<MilestoneContainer>>;

	function addItemURL(url: URL) {
		const params = paramsFromFragment(url);

		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadTypes.enum.milestone],
			[predicates.enum['is-part-of'], String(container.revision)],
			[predicates.enum['is-part-of-measure'], String(container.revision)]
		]);

		return `#${newParams.toString()}`;
	}
</script>

{#await containerRequest then containers}
	{#if containers.length > 0 || $mayCreateContainer(payloadTypes.enum.milestone)}
		<div>
			{#if containers.length > 0}
				<ul class="carousel">
					{#each containers as container}
						<li>
							<Card --height="100%" {container} />
						</li>
					{/each}
				</ul>
			{/if}
			{#if $mayCreateContainer(payloadTypes.enum.milestone)}
				<a class="button" href={addItemURL($page.url)}>
					{$_('add_item')}
				</a>
			{/if}
		</div>
	{/if}
{/await}
