<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
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
	import { addEffectState, mayCreateContainer } from '$lib/stores';

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
			[predicates.enum['is-part-of'], String(container.revision)],
			[predicates.enum['is-part-of-measure'], String(container.revision)]
		]);

		return `#${newParams.toString()}`;
	}

	async function addEffect(target: ContainerWithEffect) {
		const params = new URLSearchParams([
			[overlayKey.enum.create, payloadTypes.enum.indicator],
			['alreadyInUse', '']
		]);

		for (const category of container.payload.category) {
			params.append('category', category);
		}

		for (const topic of container.payload.topic) {
			params.append('topic', topic);
		}

		for (const measureType of container.payload.measureType) {
			params.append('measureType', measureType);
		}

		$addEffectState = { target };

		await goto(`#${params.toString()}`);
	}
</script>

{#if relatedContainers.length > 0 || $mayCreateContainer(payloadType)}
	<div>
		{#if relatedContainers.length > 0}
			<ul class="carousel">
				{#each parts as container}
					<li>
						<Card
							--height="100%"
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
		{#if $mayCreateContainer(payloadType)}
			<a
				class="button"
				href={addItemURL($page.url)}
				on:click={payloadType == payloadTypes.enum.effect
					? (event) => {
							event.preventDefault();
							addEffect(container);
						}
					: undefined}
			>
				{$_('add_item')}
			</a>
		{/if}
	</div>
{/if}
