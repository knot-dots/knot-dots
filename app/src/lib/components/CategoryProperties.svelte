<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { categoryObjectTypes, payloadTypes, type CategoryContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: CategoryContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const objectTypeLabels: Record<string, string> = {
		[payloadTypes.enum.goal]: 'goal',
		[payloadTypes.enum.program]: 'program',
		[payloadTypes.enum.measure]: 'measure',
		[payloadTypes.enum.simple_measure]: 'simple_measure',
		[payloadTypes.enum.rule]: 'rule',
		[payloadTypes.enum.knowledge]: 'knowledge',
		[payloadTypes.enum.task]: 'task',
		[payloadTypes.enum.indicator]: 'indicator',
		[payloadTypes.enum.indicator_template]: 'indicator_template',
		[payloadTypes.enum.effect]: 'effect',
		[payloadTypes.enum.objective]: 'objective'
	};

	const objectTypeOptions = $derived.by(() =>
		categoryObjectTypes.options.map((value) => ({
			label: $_(objectTypeLabels[value] ?? value),
			value
		}))
	);
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableMultipleChoice
			{editable}
			label={$_('payload_type')}
			options={objectTypeOptions}
			bind:value={container.payload.objectTypes}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet general()}
		<EditableMultipleChoice
			{editable}
			label={$_('payload_type')}
			options={objectTypeOptions}
			bind:value={container.payload.objectTypes}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}
</PropertyGrid>
