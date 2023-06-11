<script lang="ts">
	import { _ } from 'svelte-i18n';
	export let max: number;
	export let min: number;
	export let quantity: string | undefined;
	export let value: number | undefined;
	export let fulfillmentDate: string | undefined;
</script>

<div class="progress">
	<div class="wrapper">
		<span class="min">{min}</span>
		<span class="max">{max}</span>
		<div class="bar">
			{#if value}
				<span class="value" style:width={`${(100 * value) / max}%`} />
			{:else}
				<span class="value" style:width="0%" />
			{/if}
		</div>
	</div>
	{#if quantity}
		<div class="quantity">{$_(quantity)}</div>
	{/if}
	{#if fulfillmentDate}
		<div class="fulfillmentDate">
			{$_('indicator.fulfillment_date')}: {new Date(fulfillmentDate).toLocaleDateString()}
		</div>
	{/if}
</div>

<style>
	.progress {
		align-items: center;
		border: solid 1px var(--color-gray-300);
		border-radius: 8px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 0.875rem;
		padding: 12px 20px;
	}
	.wrapper {
		display: flex;
		justify-content: space-between;
		flex: 1 1 80%;
		flex-wrap: wrap;
	}
	.bar {
		--height: 6px;
		background-color: var(--color-gray-200);
		border-radius: calc(var(--height) * 0.5);
		height: var(--height);
		overflow: hidden;
		width: 100%;
	}
	.value {
		background-color: var(--color-blue-600);
		display: block;
		height: 100%;
	}
	.fulfillmentDate {
		flex: 0 0 100%;
	}
</style>
