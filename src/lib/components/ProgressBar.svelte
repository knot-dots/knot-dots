<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { isMeasureContainer, status, unitByQuantity } from '$lib/models';
	import type { Container, Indicator, Quantity } from '$lib/models';

	export let guid: string;
	export let indicator: Indicator;
	export let contributors: Container[];
	export let compact = false;

	let unit = '';

	let contributions: Record<string, number> = {
		[status.enum['status.in_operation']]: 0,
		[status.enum['status.in_implementation']]: 0
	};

	let contributionsAbsolute = 0;

	$: {
		unit =
			'quantity' in indicator && unitByQuantity.has(indicator.quantity as Quantity)
				? $_(unitByQuantity.get(indicator.quantity as Quantity) as string)
				: '';
		contributions['planned'] = 0;
		contributions['achieved'] = 0;
		contributionsAbsolute = 0;

		for (let c of contributors) {
			if (!isMeasureContainer(c)) {
				continue;
			}
			if (
				c.payload.status != status.enum['status.in_implementation'] &&
				c.payload.status != status.enum['status.in_operation']
			) {
				continue;
			}
			if (c.payload.indicatorContribution?.[guid] == undefined) {
				continue;
			}
			if (c.payload.indicatorContributionAchieved?.[guid]) {
				contributions['achieved'] +=
					(c.payload.indicatorContributionAchieved?.[guid] / indicator.max) * 100;
				contributions['planned'] +=
					((c.payload.indicatorContribution[guid] - c.payload.indicatorContributionAchieved[guid]) /
						indicator.max) *
					100;
			} else {
				contributions['planned'] += (c.payload.indicatorContribution[guid] / indicator.max) * 100;
			}
			contributionsAbsolute += c.payload.indicatorContribution[guid];
		}
	}
</script>

<div class="progress" class:progress--compact={compact}>
	<div class="wrapper">
		<span class="min">{indicator.min} {unit}</span>
		<span class="max">{indicator.max} {unit}</span>
		<div class="bar">
			{#if indicator.value}
				<span
					class="value"
					title={String(indicator.value)}
					style:width={`${(100 * indicator.value) / indicator.max}%`}
					style:background-color={indicator.value > 0.7
						? 'var(--color-green-500)'
						: indicator.value > 0.3
						? 'var(--color-yellow-200)'
						: 'var(--color-red-600)'}
				/>
			{:else if contributions['achieved'] >= 100}
				<span
					class="value"
					title={$_(`${indicator.quantity}.description`, {
						values: { contribution: contributionsAbsolute }
					})}
					style:background-color="var(--color-green-500)"
					style:width="100%"
				/>
			{:else if contributions['achieved'] + contributions['planned'] >= 100}
				<span
					class="value"
					title={$_(`${indicator.quantity}.description`, {
						values: { contribution: contributionsAbsolute }
					})}
					style:background="linear-gradient(to right, var(--color-green-500) {contributions[
						'achieved'
					]}%, var(--color-yellow-200) {contributions['achieved']}% 100%)"
					style:width="100%"
				/>
			{:else}
				<span
					class="value"
					title={$_(`${indicator.quantity}.description`, {
						values: { contribution: contributionsAbsolute }
					})}
					style:background="linear-gradient(to right, var(--color-green-500) {contributions[
						'achieved'
					]}%, var(--color-yellow-200) {contributions['achieved']}% {contributions['achieved'] +
						contributions['planned']}%, var(--color-red-600) {contributions['achieved'] +
						contributions['planned']}%) 100%"
					style:width="100%"
				/>
			{/if}
		</div>
	</div>
	{#if indicator.quantity && !compact}
		<div class="quantity">{$_(`${indicator.quantity}.label`)}</div>
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

	.progress.progress--compact {
		border: none;
		margin-bottom: 0;
		padding: 0;
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
		margin-top: 0.375rem;
		overflow: hidden;
		width: 100%;
	}

	.value {
		background-color: var(--color-blue-600);
		display: block;
		height: 100%;
	}
</style>
