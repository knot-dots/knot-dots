<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/heroicons/plus-solid';
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
	export let editable = false;
	export let payloadType: PayloadType;
	export let relatedContainers: Container[];

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
	<ul class="carousel" class:editable>
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
		{#if $mayCreateContainer(payloadType, container.managed_by) && editable}
			<li>
				<a class="card" href={addItemURL($page.url)} title={$_('add_item')}>
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
