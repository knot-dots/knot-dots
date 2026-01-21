<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableCardStyle from '$lib/components/EditableCardStyle.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type TeaserContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import EditableLinkStyle from './EditableLinkStyle.svelte';

	interface Props {
		container: TeaserContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditablePlainText {editable} label={$_('teaser.link')} bind:value={container.payload.link} />

		<EditablePlainText
			{editable}
			label={$_('teaser.link_caption')}
			bind:value={container.payload.linkCaption}
		/>

		<EditableLinkStyle
			{editable}
			label={$_('teaser.link_style')}
			bind:value={container.payload.style}
		/>

		<EditableCardStyle {editable} label={$_('card_style')} bind:value={container.payload.style} />

		<EditableImage
			{editable}
			label={$_('upload.image.choose')}
			bind:value={container.payload.image}
		/>

		<AuthoredBy {container} {revisions} />
	{/snippet}

	{#snippet general()}
		<EditablePlainText {editable} label={$_('teaser.link')} bind:value={container.payload.link} />

		<EditablePlainText
			{editable}
			label={$_('teaser.link_caption')}
			bind:value={container.payload.linkCaption}
		/>

		<EditableCategories bind:container editable={editable} organizationGuid={container.organization} />

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet ownership()}
		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
