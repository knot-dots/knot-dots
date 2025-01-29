<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		type ContainerWithEffect,
		isOverlayKey,
		isPartOf,
		isPartOfMeasure,
		overlayKey,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: ContainerWithEffect;
	export let relatedContainers: Container[];
	export let payloadType: PayloadType;

	$: parts = relatedContainers
		.filter(({ payload }) => payload.type == payloadType)
		.filter((rc) => isPartOfMeasure(container)(rc) || isPartOf(container)(rc));

	function addItemURL(url: URL) {
		const params = paramsFromFragment(url);

		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadType],
			[predicates.enum['is-part-of'], container.guid],
			[predicates.enum['is-part-of-measure'], container.guid],
			['managed-by', container.managed_by]
		]);

		return `#${newParams.toString()}`;
	}
</script>

{#if relatedContainers.length > 0 || $mayCreateContainer(payloadType, container.managed_by)}
	<div>
		{#if relatedContainers.length > 0}
			<ul class="carousel">
				{#each parts as container}
					<li>
						<Card
							{container}
							relatedContainers={relatedContainers.filter(
								({ payload, relation }) =>
									payload.type === payloadTypes.enum.indicator ||
									relation.some(({ object, subject }) => [object, subject].includes(container.guid))
							)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
		{#if $mayCreateContainer(payloadType, container.managed_by)}
			<a class="button" href={addItemURL($page.url)}>
				{$_('add_item')}
			</a>
		{/if}
	</div>
{/if}
