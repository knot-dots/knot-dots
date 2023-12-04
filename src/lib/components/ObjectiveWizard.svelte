<script lang="ts">
	import { onMount } from 'svelte';
	import { Icon, MinusSmall, PlusSmall } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import type {
		Container,
		EmptyContainer,
		IndicatorContainer,
		IndicatorObjective
	} from '$lib/models';
	import fetchContainers from '$lib/client/fetchContainers';
	import { payloadTypes } from '$lib/models';

	export let container: (Container | EmptyContainer) & {
		payload: { objective: IndicatorObjective[] };
	};

	let indicatorsRequest: Promise<IndicatorContainer[]> = new Promise(() => []);

	onMount(() => {
		indicatorsRequest = fetchContainers({
			organization: [container.organization],
			payloadType: [payloadTypes.enum.indicator]
		}) as Promise<IndicatorContainer[]>;
	});

	let showIndicatorOptions = false;

	function add(event: { currentTarget: HTMLSelectElement }) {
		showIndicatorOptions = false;
		const thisYear = new Date().getFullYear();
		container.payload.objective = [
			...(container.payload.objective ?? []),
			{
				indicator: event.currentTarget.value,
				wantedValues: [...Array(5)].map((_, index) => [thisYear + index, 0])
			}
		];
	}

	function remove(i: number) {
		return () => {
			if (container.payload.objective) {
				container.payload.objective = [
					...container.payload.objective.slice(0, i),
					...container.payload.objective.slice(i + 1)
				];
			}
		};
	}

	function appendWantedValue(objectiveIndex: number) {
		const objective = container.payload.objective[objectiveIndex];
		const year = objective.wantedValues[objective.wantedValues.length - 1][0] + 1;
		container.payload.objective[objectiveIndex].wantedValues = [
			...objective.wantedValues,
			[year, 0]
		];
	}

	function updateWantedValues(objective: IndicatorObjective, index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			objective.wantedValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}
</script>

{#await indicatorsRequest then indicators}
	{@const indicatorsByGuid = new Map(indicators.map((container) => [container.guid, container]))}
	<fieldset>
		<legend>{$_('objectives')}</legend>

		{#each container.payload.objective ?? [] as objective, objectiveIndex}
			<div class="objective">
				<table class="spreadsheet">
					<thead>
						<tr>
							<th scope="col"></th>
							<th scope="col" colspan="2">
								{$_(`${indicatorsByGuid.get(objective.indicator)?.payload.quantity}.label`)} ({$_(
									`${indicatorsByGuid.get(objective.indicator)?.payload.unit}` ?? ''
								)})
							</th>
						</tr>
						<tr>
							<th scope="col"></th>
							<th scope="col">{$_('indicator.wanted_values')}</th>
							<th scope="col">{$_('form.extrapolated_values')}</th>
						</tr>
					</thead>
					<tbody>
						{#each objective.wantedValues.map((v, i) => i) as index}
							<tr>
								<th scope="row">
									{objective.wantedValues[index][0]}
								</th>
								<td>
									<input
										type="text"
										inputmode="decimal"
										value={objective.wantedValues[index][1]}
										on:change={updateWantedValues(objective, index)}
									/>
								</td>
								<td>
									<input
										type="text"
										value={indicatorsByGuid.get(objective.indicator)?.payload.extrapolatedValues[
											index
										]
											? indicatorsByGuid.get(objective.indicator)?.payload.extrapolatedValues[
													index
											  ][1]
											: ''}
										readonly
									/>
								</td>
							</tr>
						{/each}
						<tr>
							<td colspan="3">
								<button
									class="quiet"
									title={$_('add_value')}
									type="button"
									on:click={() => appendWantedValue(objectiveIndex)}
								>
									<Icon src={PlusSmall} size="24" />
								</button>
							</td>
						</tr>
					</tbody>
				</table>
				<button type="button" on:click={remove(objectiveIndex)}>
					<Icon src={MinusSmall} size="24" mini />
				</button>
			</div>
		{/each}

		{#if showIndicatorOptions}
			<label>
				<select name="indicator" on:change={add} required>
					<option></option>
					{#each indicators as indicatorOption}
						<option value={indicatorOption.guid}>
							{indicatorOption.payload.title}
						</option>
					{/each}
				</select>
			</label>
		{:else}
			<button type="button" on:click={() => (showIndicatorOptions = true)}>
				<Icon src={PlusSmall} size="24" mini />
				{$_('indicator.wanted_values')}
			</button>
		{/if}
	</fieldset>
{/await}

<style>
	.objective {
		align-items: center;
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}
</style>
