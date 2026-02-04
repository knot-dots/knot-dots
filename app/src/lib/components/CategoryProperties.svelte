<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
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
		[payloadTypes.enum.goal]: 'category.object_types.goal',
		[payloadTypes.enum.program]: 'category.object_types.program',
		[payloadTypes.enum.measure]: 'category.object_types.measure',
		[payloadTypes.enum.simple_measure]: 'category.object_types.simple_measure',
		[payloadTypes.enum.rule]: 'category.object_types.rule',
		[payloadTypes.enum.knowledge]: 'category.object_types.knowledge',
		[payloadTypes.enum.task]: 'category.object_types.task',
		[payloadTypes.enum.indicator]: 'category.object_types.indicator',
		[payloadTypes.enum.indicator_template]: 'category.object_types.indicator_template',
		[payloadTypes.enum.effect]: 'category.object_types.effect',
		[payloadTypes.enum.objective]: 'category.object_types.objective'
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
		<EditablePlainText
			{editable}
			label={$_('category.key_label')}
			bind:value={container.payload.key}
		/>
		<EditableNumber {editable} label={$_('category.level')} bind:value={container.payload.level} />

		<EditableMultipleChoice
			{editable}
			label={$_('category.object_types.label')}
			options={objectTypeOptions}
			bind:value={container.payload.objectTypes}
		/>
		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet general()}
		<EditablePlainText
			{editable}
			label={$_('category.key_label')}
			bind:value={container.payload.key}
		/>
		<EditableNumber {editable} label={$_('category.level')} bind:value={container.payload.level} />

		<EditableMultipleChoice
			{editable}
			label={$_('category.object_types.label')}
			options={objectTypeOptions}
			bind:value={container.payload.objectTypes}
		/>
		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}
</PropertyGrid>
