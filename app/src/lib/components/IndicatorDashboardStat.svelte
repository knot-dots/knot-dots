<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import { indicatorActualData } from '$lib/indicatorActualData';
	import { rowsByHeight } from '$lib/indicatorDashboardLayout';
	import type {
		AnyPayload,
		Container,
		IndicatorDashboardItem,
		IndicatorPayload
	} from '$lib/models';

	interface Props {
		container: Container<IndicatorPayload>;
		height: IndicatorDashboardItem['height'];
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, height, relatedContainers }: Props = $props();

	// The value of the latest year, since every indicator has data up to a different year
	const latest = $derived(
		indicatorActualData(container.guid, relatedContainers).reduce<[number, number] | undefined>(
			(latest, entry) => (latest === undefined || entry[0] > latest[0] ? entry : latest),
			undefined
		)
	);

	const value = $derived(latest ? $number(latest[1]) : '');
</script>

{#if latest}
	<!-- The number is never cut; a long one gets smaller to fit the card. -->
	<p class={['stat', `stat--rows-${rowsByHeight[height]}`]} style:--characters={value.length}>
		<span class="label">
			{$_('indicator_dashboard.actual_value', { values: { year: String(latest[0]) } })}
		</span>
		<span class="value">
			<span class="number">{value}</span>
			<span class="unit">{$_(container.payload.unit)}</span>
		</span>
	</p>
{:else}
	<p class="no-data">{$_('indicator.no_data')}</p>
{/if}

<style>
	.stat {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.25rem;
		justify-content: flex-end;
		margin: 0;
		min-height: 0;
		padding-bottom: 0.5rem;
	}

	.stat--rows-1 {
		align-items: baseline;
		flex-direction: row;
		justify-content: space-between;
		padding-bottom: 0;
	}

	.label {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		line-height: 1.25;
	}

	.value {
		align-items: baseline;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.number {
		color: var(--color-text-strong);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1;
	}

	.unit {
		color: var(--color-text-subtle);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	/* A digit is about 0.6 em wide; the content is 2 rem narrower than the card. */
	.stat--rows-2 .value {
		gap: 0.5rem;
	}

	.stat--rows-2 .number {
		font-size: min(3.75rem, (100cqi - 2rem) / (var(--characters) * 0.6));
	}

	.stat--rows-2 .unit {
		font-size: 1.5rem;
		line-height: 1;
	}

	.stat--rows-4 .value {
		gap: 0.75rem;
	}

	.stat--rows-4 .number {
		font-size: min(6rem, (100cqi - 2rem) / (var(--characters) * 0.6));
	}

	.stat--rows-4 .unit {
		font-size: 2.25rem;
		line-height: 1;
	}

	@container (min-width: 700px) {
		.stat--rows-4 .number {
			font-size: min(8rem, (100cqi - 2rem) / (var(--characters) * 0.6));
		}

		.stat--rows-4 .unit {
			font-size: 3rem;
		}
	}

	.no-data {
		align-content: center;
		color: var(--color-text-default);
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
		text-align: center;
	}
</style>
