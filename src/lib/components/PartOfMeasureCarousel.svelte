<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Card from '$lib/components/Card.svelte';
	import {
		type ContainerWithEffect,
		isOverlayKey,
		overlayKey,
		paramsFromFragment,
		type PayloadType,
		predicates
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: ContainerWithEffect;
	export let payloadType: PayloadType;

	$: containerRequest = fetchRelatedContainers(container.guid, {
		payloadType: [payloadType]
	});

	function addItemURL(url: URL) {
		const params = paramsFromFragment(url);

		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadType],
			[predicates.enum['is-part-of'], String(container.revision)],
			[predicates.enum['is-part-of-measure'], String(container.revision)]
		]);

		return `#${newParams.toString()}`;
	}
</script>

{#await containerRequest then containers}
	{#if containers.length > 0 || $mayCreateContainer(payloadType)}
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
			{#if $mayCreateContainer(payloadType)}
				<a class="button" href={addItemURL($page.url)}>
					{$_('add_item')}
				</a>
			{/if}
		</div>
	{/if}
{/await}
