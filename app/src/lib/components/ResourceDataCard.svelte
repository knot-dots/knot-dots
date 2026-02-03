<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import { type ResourceDataContainer, type ResourceV2Container } from '$lib/models';

	interface Props {
		container: ResourceDataContainer;
		resourceContainer?: ResourceV2Container;
		href?: () => string;
	}

	let { container, resourceContainer = undefined, href }: Props = $props();

	const totalAmount = $derived.by(() =>
		container.payload.entries.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0)
	);

	const formattedTotal = $derived.by(() =>
		new Intl.NumberFormat(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(totalAmount)
	);
</script>

<Card {container} {href}>
	{#snippet body()}
		<div class="resource-data-card__body">
			<div class="resource-data-card__number">
				<p class="resource-data-card__amount">{formattedTotal}</p>
				{#if resourceContainer}
					<p class="resource-data-card__unit">{$_(resourceContainer.payload.resourceUnit)}</p>
				{/if}
			</div>
			<p class="resource-data-card__label">{$_('total')}</p>
		</div>
	{/snippet}

	{#snippet footer()}
		{#if resourceContainer && resourceContainer.payload.title}
			<span class="badge">{resourceContainer.payload.title}</span>
		{/if}
	{/snippet}
</Card>

<style>
	.resource-data-card__body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.resource-data-card__number {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
	}

	.resource-data-card__amount {
		color: var(--color-gray-900);
		font-size: 1.875rem; /* 30px */
		font-weight: 700;
		line-height: 1.5;
		margin: 0;
	}

	.resource-data-card__unit {
		color: var(--color-gray-500);
		font-size: 1rem; /* 16px */
		font-weight: 600;
		line-height: 1.5;
		margin: 0;
	}

	.resource-data-card__label {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.5;
		margin: 0;
	}
</style>
