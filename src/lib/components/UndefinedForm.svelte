<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { containerOfType, payloadTypes } from '$lib/models';
	import type { AnyContainer, Container, EmptyContainer, PayloadType } from '$lib/models';
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
			items: [payloadTypes.enum['internal_objective.milestone'], payloadTypes.enum.operational_goal]
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

		if ('derivedFrom' in $page.state) {
			const derivedFrom = $page.state.derivedFrom as Container;

			container.payload = {
				...container.payload,
				...('audience' in derivedFrom.payload && 'audience' in container.payload
					? { audience: derivedFrom.payload.audience }
					: undefined),
				...('category' in derivedFrom.payload && 'category' in container.payload
					? { category: derivedFrom.payload.category }
					: undefined),
				...('status' in derivedFrom.payload && 'status' in container.payload
					? { status: derivedFrom.payload.status }
					: undefined),
				...('taskStatus' in derivedFrom.payload && 'taskStatus' in container.payload
					? { taskStatus: derivedFrom.payload.taskStatus }
					: undefined),
				...('topic' in derivedFrom.payload && 'topic' in container.payload
					? { topic: derivedFrom.payload.topic }
					: undefined),
				...('visibility' in derivedFrom.payload && 'visibility' in container.payload
					? { visibility: derivedFrom.payload.visibility }
					: undefined)
			};
		}
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
