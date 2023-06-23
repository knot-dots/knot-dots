<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { quantities } from '$lib/models';
	import type { Indicator } from '$lib/models';

	export let indicator: Indicator[];
	export let locked = false;

	let indicatorType =
		indicator.length > 0
			? 'quantity' in indicator[0]
				? (indicator[0].quantity as string)
				: 'okr'
			: '';

	function select(event: Event) {
		if ((event.target as HTMLSelectElement).value == 'okr') {
			indicator = [
				{
					max: 1,
					min: 0,
					value: 0.5
				}
			];
		} else if ((event.target as HTMLSelectElement).value.startsWith('quantity.')) {
			indicator = [
				{
					max: 100,
					min: 0,
					quantity: (event.target as HTMLSelectElement).value,
					value: 0
				}
			];
		}
	}
</script>

<fieldset class="indicator">
	<legend>{$_('indicator.legend')}</legend>
	<select name="indicator" bind:value={indicatorType} on:change={select} disabled={locked}>
		<option value="okr">{$_('indicator.okr')}</option>
		{#each quantities.options as quantityOption}
			<option value={quantityOption}>{$_(`${quantityOption}.label`)}</option>
		{/each}
	</select>
	{#if indicator.length > 0 && 'quantity' in indicator[0]}
		<input
			type="text"
			inputmode="numeric"
			name="indicator-max"
			bind:value={indicator[0].max}
			readonly={locked}
			required
		/>
		<input
			type="date"
			name="indicator-fulfillmentDate"
			bind:value={indicator[0].fulfillmentDate}
			readonly={locked}
			required
		/>
	{:else if indicator.length > 0}
		<input
			type="range"
			name="indicator-value"
			max={indicator[0].max}
			min={indicator[0].min}
			step={indicator[0].max / 10}
			bind:value={indicator[0].value}
		/>
	{/if}
</fieldset>

<style>
	input,
	select {
		display: inline;
		vertical-align: middle;
		width: initial;
	}

	input[type='date'] {
		display: inline-flex;
		max-height: 45px;
	}

	.indicator input[name='indicator-max'] {
		text-align: right;
		width: 6em;
	}
</style>
