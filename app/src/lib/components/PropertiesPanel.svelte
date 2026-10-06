<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import Close from '~icons/knotdots/close';
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import CustomCategoryDropdown from '$lib/components/CustomCategoryDropdown.svelte';
	import DefaultEditableProperty from '$lib/components/DefaultEditableProperty.svelte';
	import EditableAssignee from '$lib/components/EditableAssignee.svelte';
	import EditableCardStyle from '$lib/components/EditableCardStyle.svelte';
	import EditableGoalStatus from '$lib/components/EditableGoalStatus.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditableIndicatorUnit from '$lib/components/EditableIndicatorUnit.svelte';
	import EditableLinkStyle from '$lib/components/EditableLinkStyle.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditablePDF from '$lib/components/EditablePDF.svelte';
	import EditableProgram from '$lib/components/EditableProgram.svelte';
	import EditableProgramStatus from '$lib/components/EditableProgramStatus.svelte';
	import EditableRuleStatus from '$lib/components/EditableRuleStatus.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import EditableTaskStatus from '$lib/components/EditableTaskStatus.svelte';
	import { getDetailViewContext } from '$lib/contexts/detailView';
	import {
		anyPayload,
		type AnyPayload,
		type Container,
		type ContainerWithCategory,
		isContainerWithCategory,
		isContainerWithImage,
		isGoalContainer,
		isIndicatorContainer,
		isMeasureContainer,
		isProgramContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		isTeaserContainer,
		payloadRegistry,
		predicates,
		propertyRegistry
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const organization = $derived(
		page.data.organizations.find((o) => o.guid === container.organization)
	);

	const payloadSchema = $derived(z.getDiscriminatedOption(anyPayload, container.payload.type));

	const configuration = $derived(
		organization?.payload.propertiesConfiguration[container.payload.type] ??
			payloadRegistry.get(payloadSchema)?.layout?.detail ?? { headerAndPanel: [], onlyPanel: [] }
	);

	const isPartOfMeasure = $derived(
		container.relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
	);

	const detailView = getDetailViewContext();
</script>

{#if configuration && detailView && detailView.properties.open}
	<div {...detailView.properties.content} class="details-properties">
		<h2>
			{$_('properties')}
			<button class="action-button" onclick={detailView.properties.trigger.onclick} type="button">
				<Close />
				<span class="is-visually-hidden">{$_('close')}</span>
			</button>
		</h2>

		{#each [...configuration.headerAndPanel, ...configuration.onlyPanel] as item (item)}
			{#if item == 'assignee' && isTaskContainer(container)}
				{const managedBy = $derived(container.managed_by[0])}
				{const candidatesPromise = $derived(fetchMembers(managedBy))}
				<EditableAssignee bind:value={container.payload.assignee} {candidatesPromise} {editable} />
			{:else if item == 'cardStyle' && isTeaserContainer(container)}
				<EditableCardStyle
					bind:value={container.payload.cardStyle}
					{editable}
					label={$_('card_style')}
				/>
			{:else if item.startsWith('category.') && 'category' in payloadSchema.shape && isContainerWithCategory(container)}
				{const key = item.split('.')[1]}
				{const id = crypto.randomUUID()}
				<div class="label" {id}>{page.data.categoryContext.labels.get(key)}</div>
				<CustomCategoryDropdown
					bind:value={
						() => (container as ContainerWithCategory).payload['category'][key] ?? [],
						(v) => ((container as ContainerWithCategory).payload.category[key] = v)
					}
					{editable}
					labelledBy={id}
					options={page.data.categoryContext.options[key] ?? []}
				/>
			{:else if item == 'image' && isContainerWithImage(container)}
				{const key = item as keyof typeof payloadSchema.shape}
				{const schema = payloadSchema.shape[key]}
				{const meta = propertyRegistry.get(schema)}
				<EditableImage
					bind:value={container.payload.image}
					{editable}
					label={$_(meta?.label ?? 'image')}
				/>
			{:else if item == 'measure' && (!isGoalContainer(container) || isPartOfMeasure)}
				<EditableMeasure bind:container {editable} />
			{:else if item == 'organization'}
				<EditableOrganization bind:value={container.organization} {editable} />
			{:else if item == 'organizational_unit'}
				<EditableOrganizationalUnit
					bind:value={container.organizational_unit}
					{editable}
					organization={container.organization}
				/>
			{:else if item == 'parent'}
				<EditableParent bind:container {editable} />
			{:else if item == 'pdf' && isProgramContainer(container)}
				<EditablePDF bind:value={container.payload.pdf} {editable} />
			{:else if item == 'program' && !isPartOfMeasure}
				<EditableProgram bind:container {editable} />
			{:else if item == 'status'}
				{#if isGoalContainer(container)}
					<EditableGoalStatus bind:value={container.payload.status} {editable} />
				{:else if isMeasureContainer(container) || isSimpleMeasureContainer(container)}
					<EditableStatus bind:value={container.payload.status} {editable} />
				{:else if isProgramContainer(container)}
					<EditableProgramStatus bind:value={container.payload.status} {editable} />
				{:else if isRuleContainer(container)}
					<EditableRuleStatus bind:value={container.payload.status} {editable} />
				{:else if isTaskContainer(container)}
					<EditableTaskStatus bind:value={container.payload.status} {editable} />
				{/if}
			{:else if item == 'style' && isTeaserContainer(container)}
				<EditableLinkStyle
					bind:value={container.payload.style}
					{editable}
					label={$_('teaser_link_style')}
				/>
			{:else if item == 'unit' && isIndicatorContainer(container)}
				<EditableIndicatorUnit bind:value={container.payload.unit} {editable} />
			{:else if item in payloadSchema.shape}
				{const key = item as keyof typeof payloadSchema.shape}
				{const schema = payloadSchema.shape[key]}
				<DefaultEditableProperty bind:value={container.payload[key]} {editable} {schema} />
			{/if}
		{/each}
	</div>
{/if}

<style>
	.details-properties {
		--dropdown-button-border-radius: var(--form-control-border-radius);
		--dropdown-button-border-width: 1px;
		--dropdown-button-default-background: var(--form-control-background);
		--dropdown-button-min-height: var(--form-control-min-height);
		--dropdown-button-padding-y: var(--form-control-padding-y);
		--dropdown-button-padding-x: calc(var(--form-control-padding-x) / 2);
		--dropdown-panel-max-width: 100%;
		--form-control-background: var(--color-white);

		border-radius: 8px 12px 12px 8px;
		border: 1px solid var(--color-border-subtle);
		background: var(--color-surface-container);
		height: calc(100% - 0.5rem);
		max-width: min(23.75rem, 100%);
		width: 23.75rem;
		overflow-y: auto;
		padding: 0.5rem 1rem;
		position: absolute;
		right: 0;
		top: 0.25rem;
		z-index: 1;
	}

	.details-properties h2 {
		align-items: center;
		color: var(--color-text-strong);
		display: flex;
		font-size: 1rem;
		font-weight: 500;
		justify-content: space-between;
		line-height: 1.25;
		margin-bottom: 2.5rem;
	}
</style>
