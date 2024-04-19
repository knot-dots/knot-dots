<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { containerOfType, payloadTypes } from '$lib/models';
	import type { AnyContainer, EmptyContainer, PayloadType } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: AnyContainer | EmptyContainer;

	const payloadGroups = [
		{
			label: 'payload_group.long_term_goals',
			items: [payloadTypes.enum.model, payloadTypes.enum['internal_objective.vision']]
		},
		{ label: 'payload_group.strategic_goals', items: [payloadTypes.enum.strategic_goal] },
		{
			label: 'payload_group.measurable_goals',
			items: [
				payloadTypes.enum.kpi,
				payloadTypes.enum['internal_objective.milestone'],
				payloadTypes.enum.operational_goal
			]
		},
		{
			label: 'payload_group.implementation',
			items: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
		},
		{ label: 'payload_group.misc', items: [payloadTypes.enum.text] }
	];

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
			{#each payloadGroups as { label, items }}
				<optgroup label={$_(label)}>
					{#each items as option}
						<option value={option}>{$_(option)}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	</label>
</fieldset>
