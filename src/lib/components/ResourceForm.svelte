<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { EmptyResourceContainer, PartialRelation, ResourceContainer } from '$lib/models';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { applicationState } from '$lib/stores';
	import { page } from '$app/stores';

	export let container: ResourceContainer | EmptyResourceContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			tabs: []
		}
	}));

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of'
				})
			);
	}
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('unit')}
		<input type="text" name="unit" bind:value={container.payload.unit} required />
	</label>

	<label>
		{$_('amount')}
		<input
			type="text"
			inputmode="numeric"
			name="amount"
			bind:value={container.payload.amount}
			required
		/>
	</label>

	<label>
		{$_('fulfillment_date')}
		<input
			type="date"
			name="fulfillmentDate"
			bind:value={container.payload.fulfillmentDate}
			required
		/>
	</label>
</fieldset>
