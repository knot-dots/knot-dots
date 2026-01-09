<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchContainers from '$lib/client/fetchContainers';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableProgram from '$lib/components/EditableProgram.svelte';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import {
		type AnyContainer,
		type Container,
		type KnowledgeContainer,
		isContentPartnerContainer,
		payloadTypes
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: KnowledgeContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();

	// todo: dummy categories
	const knowledgeCategories = [
		{ label: $_('knowledge.category.publication'), value: 'publication' },
		{ label: $_('knowledge.category.tool'), value: 'tool' },
		{ label: $_('knowledge.category.best_practise'), value: 'best_practise' }
	];

	// todo: dummy tags
	const tagsByCategory: Record<string, { label: string; value: string }[]> = {
		publication: [
			{ label: $_('knowledge.tags.measure'), value: 'measure' },
			{ label: $_('knowledge.tags.recommendation'), value: 'recommendation' },
			{ label: $_('knowledge.tags.goal'), value: 'goal' }
		],
		tool: [
			{ label: $_('knowledge.tags.measure'), value: 'measure' },
			{ label: $_('knowledge.tags.recommendation'), value: 'recommendation' },
			{ label: $_('knowledge.tags.goal'), value: 'goal' }
		],
		best_practise: [
			{ label: $_('knowledge.tags.report'), value: 'report' },
			{ label: $_('knowledge.tags.xlsx'), value: 'xlsx' },
			{ label: $_('knowledge.tags.app'), value: 'app' }
		]
	};

	let availableTags = $derived(
		tagsByCategory[container.payload.knowledgeCategory]?.sort((a, b) =>
			a.label.localeCompare(b.label)
		) || []
	);

	let contentPartners: AnyContainer[] = $state([]);

	$effect(() => {
		fetchContainers({ payloadType: [payloadTypes.enum.content_partner] }).then((containers) => {
			contentPartners = containers;
		});
	});

	let contentPartnerOptions = $derived(
		contentPartners
			.filter(isContentPartnerContainer)
			.map((c) => ({ label: c.payload.title, value: c.guid }))
			.sort((a, b) => a.label.localeCompare(b.label))
	);
</script>

<PropertyGrid>
	{#snippet general()}
		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		<EditableDate
			editable={editable && $ability.can('update', container)}
			label={$_('date')}
			bind:value={container.payload.date}
		/>

		<EditableProgram {editable} bind:container />

		<EditableParent bind:container {editable} />

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet categories()}
		<EditableSingleChoice
			{editable}
			label={$_('knowledge.category')}
			options={knowledgeCategories}
			bind:value={container.payload.knowledgeCategory}
		/>

		{#if availableTags.length > 0}
			<EditableMultipleChoice
				{editable}
				label={$_('knowledge.tags')}
				options={availableTags}
				bind:value={container.payload.tags}
			/>
		{/if}

		<EditableSingleChoice
			{editable}
			label={$_('knowledge.content_partner')}
			options={contentPartnerOptions}
			bind:value={container.payload.content_partner}
		/>

		<EditableTopic {editable} bind:value={container.payload.topic} />

		<EditablePolicyFieldBNK {editable} bind:value={container.payload.policyFieldBNK} />

		<EditableAudience {editable} bind:value={container.payload.audience} />
	{/snippet}

	{#snippet ownership()}
		<ManagedBy {container} {relatedContainers} />

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>

		<EditableOrganization
			editable={editable && $ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
