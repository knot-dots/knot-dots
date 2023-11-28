<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import { payloadTypes, predicates } from '$lib/models';
	import type { Container, IndicatorContainer, IndicatorObjective } from '$lib/models';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[] = [];

	let div: HTMLElement;
	let showObjectives = true;
	let objectives = [] as IndicatorObjective[];

	if (showObjectives) {
		const containersWithObjectives = relatedContainers
			.filter(({ payload }) => 'objective' in payload)
			.filter(
				({ payload, relation, revision }) =>
					payload.type == payloadTypes.enum.model ||
					relation.findIndex(
						({ predicate, subject }) =>
							predicate == predicates.enum['is-part-of'] && subject == revision
					) == -1
			) as Array<Container & { payload: { objective: IndicatorObjective[] } }>;

		objectives = containersWithObjectives
			.map(({ payload }) => payload.objective)
			.flat()
			.filter(({ indicator }) => indicator == container.guid);
	}

	$: {
		let quantity = $_(`${container.payload.quantity}.label`);
		let unit = $_(container.payload.unit);

		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.areaY(
						[...container.payload.historicValues, ...container.payload.extrapolatedValues].map(
							([key, value]) => ({ Year: key, Value: value })
						),
						{ x: 'Year', y: 'Value', fillOpacity: 0.1, curve: 'linear' }
					),
					Plot.lineY(
						container.payload.extrapolatedValues.map(([key, value]) => ({
							Year: key,
							Value: value
						})),
						{
							x: 'Year',
							y: 'Value',
							stroke: 'grey',
							strokeWidth: 1
						}
					),
					...(showObjectives && objectives.length > 0
						? [
								Plot.lineY(
									objectives
										.map(({ wantedValues }) => wantedValues)
										.reduce((previousValue, currentValue) =>
											currentValue.map(([year, value], index) => [
												year,
												value + previousValue[index][1]
											])
										)
										.map((wantedValues) => ({ Year: wantedValues[0], Value: wantedValues[1] })),
									{
										x: 'Year',
										y: 'Value',
										stroke: 'red',
										strokeWidth: 1
									}
								)
						  ]
						: []),
					Plot.ruleX([new Date().getFullYear()])
				],
				x: { label: null, tickFormat: '' },
				y: { label: `${quantity} (${unit})` }
			})
		);
	}
</script>

<figure>
	<div bind:this={div} role="img"></div>
	{#if relatedContainers.length > 0}
		<ul class="options">
			<li>
				<label>
					<input type="checkbox" bind:checked={showObjectives} />
					{$_('indicator.wanted_values')}
				</label>
			</li>
		</ul>
	{/if}
</figure>

<style>
	figure {
		display: flex;
		gap: 1rem;
	}
</style>
