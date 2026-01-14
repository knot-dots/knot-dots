<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type ContentPartnerContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ContentPartnerContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableImage
			{editable}
			label={$_('image')}
			bind:value={container.payload.image}
			bind:sourceAttribute={container.payload.imageSource}
		/>
		<AuthoredBy {container} {revisions} />
	{/snippet}

	{#snippet general()}
		<EditableAudience {editable} bind:value={container.payload.audience} />

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet ownership()}
		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
