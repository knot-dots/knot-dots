<script lang="ts">
	import { Icon, Plus } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { quantities } from '$lib/models';
	import type { Indicator } from '$lib/models';

	export let indicator: Indicator[];

	function addOKR() {
		indicator = [...indicator, { max: 1, min: 0, value: 0.5 }];
	}

	function addQuantity() {
		indicator = [...indicator, { max: 100, min: 0, quantity: '', value: 0, fulfillmentDate: '' }];
	}
</script>

<fieldset class="indicator">
	<legend>{$_('indicator.legend')}</legend>
	{#if indicator.length == 0}
		<button type="button" class="primary" on:click={addOKR}>
			<Icon src={Plus} size="20" mini />
			{$_('add_okr')}
		</button>
		<button type="button" class="primary" on:click={addQuantity}>
			<Icon src={Plus} size="20" mini />
			{$_('add_quantity')}
		</button>
	{:else if 'quantity' in indicator[0]}
		<select name="indicator-quantity" bind:value={indicator[0].quantity} required>
			<option />
			{#each quantities.options as quantityOption}
				<option value={quantityOption}>{$_(`${quantityOption}.label`)}</option>
			{/each}
		</select>
		<input
			type="text"
			inputmode="numeric"
			name="indicator-max"
			bind:value={indicator[0].max}
			required
		/>
		<input
			type="date"
			name="indicator-fulfillmentDate"
			bind:value={indicator[0].fulfillmentDate}
			required
		/>
	{:else}
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
	button {
		align-items: center;
		display: inline-flex;
	}

	:global(button > svg) {
		margin-left: -1px;
		margin-right: 2px;
	}

	.indicator input,
	.indicator select {
		display: inline;
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
