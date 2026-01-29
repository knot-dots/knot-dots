<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCardStyle from '$lib/components/EditableCardStyle.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { type AnyContainer, type TeaserContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import EditableLinkStyle from './EditableLinkStyle.svelte';

	type LegacyPayload = {
		category: string[];
		topic: string[];
		policyFieldBNK: string[];
		audience: string[];
	};

	interface Props {
		container: TeaserContainer;
		editable?: boolean;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, revisions }: Props = $props();
	let legacyPayload = $state<LegacyPayload | null>(null);

	const featureDecisions = createFeatureDecisions(page.data.features ?? []);

	$effect(() => {
		if (featureDecisions.useCustomCategories()) {
			legacyPayload = null;
			return;
		}

		const payload = container.payload as Partial<LegacyPayload>;
		legacyPayload = {
			category: payload.category ?? [],
			topic: payload.topic ?? [],
			policyFieldBNK: payload.policyFieldBNK ?? [],
			audience: payload.audience ?? []
		};
	});
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

		{#if featureDecisions.useCustomCategories()}
			<EditableCategories bind:container {editable} organizationGuid={container.organization} />
		{:else if legacyPayload}
			<EditableCategory {editable} bind:value={legacyPayload.category} />
			<EditableTopic {editable} bind:value={legacyPayload.topic} />
			<EditablePolicyFieldBNK {editable} bind:value={legacyPayload.policyFieldBNK} />
			<EditableAudience {editable} bind:value={legacyPayload.audience} />
		{/if}

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet ownership()}
		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
