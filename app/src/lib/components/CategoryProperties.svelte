<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type CategoryContainer, type Container } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: CategoryContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers: _relatedContainers,
		revisions: _revisions
	}: Props = $props();

	function slugify(source: string) {
		return source
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	$effect(() => {
		if (!editable || container.payload.key || !container.payload.title?.trim()) {
			return;
		}
		const slug = slugify(container.payload.title);
		if (slug) {
			container.payload.key = slug;
		}
	});
</script>

<PropertyGrid>
	{#snippet top()}
		<EditablePlainText
			{editable}
			label={$_('category.key_label')}
			bind:value={container.payload.key}
		/>

		<EditableNumber {editable} label={$_('category.level')} bind:value={container.payload.level} />

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

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}
</PropertyGrid>
