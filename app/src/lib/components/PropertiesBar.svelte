<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import Label from '~icons/flowbite/label-solid';
	import AskAI from '~icons/knotdots/ask-ai';
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import DefaultInlineEditableProperty from '$lib/components/DefaultInlineEditableProperty.svelte';
	import InlineEditableAssignee from '$lib/components/InlineEditableAssignee.svelte';
	import InlineEditableCardStyle from '$lib/components/InlineEditableCardStyle.svelte';
	import InlineEditableCategory from '$lib/components/InlineEditableCategory.svelte';
	import InlineEditableIndicatorUnit from '$lib/components/InlineEditableIndicatorUnit.svelte';
	import InlineEditableLinkStyle from '$lib/components/InlineEditableLinkStyle.svelte';
	import InlineEditableMeasure from '$lib/components/InlineEditableMeasure.svelte';
	import InlineEditableOrganizationalUnit from '$lib/components/InlineEditableOrganizationalUnit.svelte';
	import InlineEditableOrganization from '$lib/components/InlineEditableOrganization.svelte';
	import InlineEditableParent from '$lib/components/InlineEditableParent.svelte';
	import InlineEditableProgram from '$lib/components/InlineEditableProgram.svelte';
	import InlineStatusDropdown from '$lib/components/InlineStatusDropdown.svelte';
	import { getDetailViewContext } from '$lib/contexts/detailView';
	import {
		anyPayload,
		type AnyPayload,
		type Container,
		type ContainerWithCategory,
		isContainerWithCategory,
		isContainerWithStatus,
		isGoalContainer,
		isIndicatorContainer,
		isRuleContainer,
		isTaskContainer,
		isTeaserContainer,
		payloadRegistry,
		predicates,
		type Status
	} from '$lib/models';
	import { moduleByType } from '$lib/modules';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		showPropertiesTrigger?: boolean;
	}

	let {
		container = $bindable(),
		editable = false,
		showPropertiesTrigger = false
	}: Props = $props();

	const organization = $derived(page.data.currentOrganization);

	const payloadSchema = $derived(z.getDiscriminatedOption(anyPayload, container.payload.type));

	const configuration = $derived(
		organization?.payload.propertiesConfiguration[container.payload.type] ??
			payloadRegistry.get(payloadSchema)?.layout?.detail ?? { headerAndPanel: [], onlyPanel: [] }
	);

	const isPartOfMeasure = $derived(
		container.relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
	);

	const detailView = getDetailViewContext();

	const subTypes = new Set(['goalType', 'measureType', 'programType', 'taskCategory']);

	function statusLabelFn(s: Status): string {
		if (s === 'status.in_operation') {
			return isRuleContainer(container)
				? $_('status.in_application')
				: $_('status.in_operation.short');
		}
		return $_(s);
	}
</script>

<ul class="details-properties">
	{#if configuration}
		{#each configuration.headerAndPanel as item (item)}
			<li class={subTypes.has(item) ? `module-${moduleByType.get(container.payload.type)}` : ''}>
				{#if item == 'assignee' && isTaskContainer(container)}
					{const managedBy = $derived(container.managed_by[0])}
					{const candidatesPromise = $derived(fetchMembers(managedBy))}
					<InlineEditableAssignee
						bind:value={container.payload.assignee}
						{candidatesPromise}
						{editable}
					/>
				{:else if item == 'cardStyle' && isTeaserContainer(container)}
					<InlineEditableCardStyle bind:value={container.payload.cardStyle} {editable} />
				{:else if item.startsWith('category.') && 'category' in payloadSchema.shape && isContainerWithCategory(container)}
					{const key = item.split('.')[1]}
					<InlineEditableCategory
						bind:value={
							() => (container as ContainerWithCategory).payload['category'][key] ?? [],
							(v) => ((container as ContainerWithCategory).payload.category[key] = v)
						}
						{editable}
						label={page.data.categoryContext.labels.get(key) ?? ''}
						options={page.data.categoryContext.options[key] ?? []}
					/>
				{:else if item == 'measure' && (!isGoalContainer(container) || isPartOfMeasure)}
					<InlineEditableMeasure bind:container {editable} />
				{:else if item == 'organization'}
					<InlineEditableOrganization bind:value={container.organization} {editable} />
				{:else if item == 'organizational_unit'}
					<InlineEditableOrganizationalUnit
						bind:value={container.organizational_unit}
						{editable}
						organization={container.organization}
					/>
				{:else if item == 'parent'}
					<InlineEditableParent bind:container {editable} />
				{:else if item == 'program' && !isPartOfMeasure}
					<InlineEditableProgram bind:container {editable} />
				{:else if item == 'status' && isContainerWithStatus(container)}
					<InlineStatusDropdown
						bind:value={container.payload.status}
						{editable}
						labelFn={statusLabelFn}
					/>
				{:else if item == 'style' && isTeaserContainer(container)}
					<InlineEditableLinkStyle bind:value={container.payload.style} {editable} />
				{:else if item == 'unit' && isIndicatorContainer(container)}
					<InlineEditableIndicatorUnit bind:value={container.payload.unit} {editable} />
				{:else if item in payloadSchema.shape}
					{const key = item as keyof typeof payloadSchema.shape}
					{const schema = payloadSchema.shape[key]}
					<DefaultInlineEditableProperty bind:value={container.payload[key]} {editable} {schema} />
				{/if}
			</li>
		{/each}
	{/if}

	{#if 'aiContribution' in container.payload && container.payload.aiContribution > 0}
		<li>
			<span class="badge badge--yellow">
				<AskAI />
				{container.payload.aiContribution == 1 ? $_('ai_generated') : $_('ai_assisted')}
			</span>
		</li>
	{/if}

	{#if detailView && showPropertiesTrigger}
		<li>
			<button
				{...detailView.properties.trigger}
				class="button-alternate button-sm system-primary"
				type="button"
			>
				<Label />{$_('properties.show_all')}
			</button>
		</li>
	{/if}
</ul>

<style>
	.details-properties {
		--badge-border-radius: 8px;
		--badge-border-width: 1px;
		--badge-min-height: 1.75rem;
		--badge-padding-x: 0.5rem;
		--dropdown-button-active-background: transparent;
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon: var(--icon--flowbite--chevron-sort-outline);
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: transparent;
		--dropdown-button-expanded-chevron-icon: var(--icon--flowbite--chevron-sort-outline);
		--dropdown-button-hover-background: transparent;
		--dropdown-button-gap: 0.125rem;
		--dropdown-button-padding-x: 0;
		--dropdown-button-padding-y: 0;
		--dropdown-panel-max-width: max(40rem, 100%);
		--form-control-border: solid 1px var(--color-border-raised);
		--form-control-border-radius: 8px;
		--form-control-min-height: 1.75rem;
		--form-control-padding-x: 0.5rem;
		--form-control-padding-y: 0rem;

		display: flex;
		flex-wrap: wrap;
		padding: 0.375rem 0 0.75rem;
	}

	li {
		min-width: 0;
	}

	li:not(:has(> button)) {
		border-radius: 12px;
		padding: 0.25rem;
	}

	li:not(:has(> button)):hover {
		background-color: var(--color-background-accent-hover);
	}

	li:empty {
		display: none;
	}

	li :global(.dropdown-button.dropdown-button--select::after) {
		align-self: center;
		margin-top: 0;
	}
</style>
