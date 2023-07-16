<script lang="ts">
	import { Icon, MinusSmall, PlusSmall } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import type { EmptyMeasureContainer, MeasureContainer } from '$lib/models';

	export let container: MeasureContainer | EmptyMeasureContainer;

	function add() {
		container.payload.resource = [
			...(container.payload.resource ?? []),
			{ amount: 0, fulfillmentDate: '', label: '', unit: '' }
		];
	}

	function remove(i: number) {
		return () => {
			if (container.payload.resource) {
				container.payload.resource = [
					...container.payload.resource.slice(0, i),
					...container.payload.resource.slice(i + 1)
				];
			}
		};
	}
</script>

<fieldset>
	<legend>{$_('resources.label')}</legend>
	{#each container.payload.resource ?? [] as resource, i}
		<div class="resource">
			<label>
				{$_('resources.label')}
				<input type="text" name="label" maxlength="50" bind:value={resource.label} required />
			</label>
			<label>
				{$_('resources.unit')}
				<input type="text" name="unit" bind:value={resource.unit} required />
			</label>
			<label>
				{$_('resources.amount')}
				<input
					type="text"
					inputmode="numeric"
					name="amount"
					bind:value={resource.amount}
					required
				/>
			</label>
			<label>
				{$_('resources.fulfillmentDate')}
				<input type="date" name="fulfillmentDate" bind:value={resource.fulfillmentDate} required />
			</label>
			<button type="button" on:click={remove(i)}>
				<Icon src={MinusSmall} size="24" mini />
			</button>
		</div>
	{/each}
	<button type="button" on:click={add}>
		<Icon src={PlusSmall} size="24" mini />
		{$_('resources.label')}
	</button>
</fieldset>

<style>
	label {
		display: block;
		flex-grow: 1;
	}

	.resource {
		border-bottom: solid 1px var(--color-gray-300);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
	}

	.resource button {
		margin-left: auto;
	}
</style>
