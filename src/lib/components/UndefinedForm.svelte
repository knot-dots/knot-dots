<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { containerOfType, payloadTypes } from '$lib/models';
	import type { AnyContainer, EmptyContainer, PayloadType } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: AnyContainer | EmptyContainer;

	async function restart(event: { currentTarget: HTMLSelectElement }) {
		container.payload = containerOfType(
			event.currentTarget.value as PayloadType,
			container.organization,
			container.organizational_unit,
			container.realm
		).payload;
	}

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'metadata',
			tabs: ['metadata']
		}
	}));
</script>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<label>
		{$_('payload_type')}
		<select name="type" on:change={restart} required>
			<option></option>
			{#each [payloadTypes.enum.model, payloadTypes.enum.strategic_goal, payloadTypes.enum.operational_goal, payloadTypes.enum.measure, payloadTypes.enum.text] as payloadTypeOption}
				<option value={payloadTypeOption}>{$_(payloadTypeOption)}</option>
			{/each}
		</select>
	</label>
</fieldset>
