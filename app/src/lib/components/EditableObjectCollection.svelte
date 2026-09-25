<script lang="ts">
	import { resource } from 'runed';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import createCreationTemplateAvailability from '$lib/client/createCreationTemplateAvailability.svelte';
	import fetchContainers from '$lib/client/fetchContainers';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		createTemplateInstanceOf,
		isProgramContainer,
		isTemplateContainer,
		listTypes,
		type NewContainer,
		type ObjectCollectionObjectType,
		type ObjectCollectionPayload,
		payloadTypes,
		predicates
	} from '$lib/models';
	import {
		ability,
		addItemState,
		mayCreateContainer,
		newContainer,
		openContainerCopyDialog
	} from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: Container<ObjectCollectionPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const idForTitle = crypto.randomUUID();

	// Only objects created from this section belong to it.
	let items = $derived(
		container.payload.item
			.map((guid) => relatedContainers.find((c) => c.guid === guid))
			.filter((c): c is Container<AnyPayload> => c !== undefined)
	);

	let useTemplates = $derived(createFeatureDecisions(page.data.features).useTemplateWorkspaces());
	let bound = $derived(container.payload.newItemTemplate !== undefined);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	const templateResource = resource(
		[
			() => (useTemplates ? container.payload.newItemTemplate : undefined),
			() => parentContainer.guid
		],
		async ([templateGuid, scopeGuid], _, { signal }) => {
			if (!templateGuid) {
				return undefined;
			}
			const containers = await fetchContainers(
				{ availableIn: scopeGuid, guid: [templateGuid], template: 'true' },
				'alpha',
				{ signal }
			);
			return containers.find(isTemplateContainer);
		}
	);

	const templateAvailability = createCreationTemplateAvailability(() =>
		editable && !bound ? createItem() : undefined
	);

	function applicableCategories(objectType: ObjectCollectionObjectType) {
		if (!('category' in parentContainer.payload)) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(parentContainer.payload.category).filter(([key]) =>
				page.data.categoryContext.objectTypesPerKey[key]?.some((t) => t === objectType)
			)
		);
	}

	function createItem() {
		const objectType = container.payload.objectType;
		const item = {
			// items join the section's manager; relations follow separately
			...containerOfType(objectType, container),
			managed_by: container.managed_by,
			relation: []
		} as NewContainer;

		if (isProgramContainer(parentContainer)) {
			item.relation = [
				{
					object: parentContainer.guid,
					position: parentContainer.relation.filter(
						({ object, predicate }) =>
							predicate === predicates.enum['is-part-of-program'] && object === parentContainer.guid
					).length,
					predicate: predicates.enum['is-part-of-program']
				}
			];
		}

		if ('category' in item.payload) {
			item.payload.category = applicableCategories(objectType);
		}

		return item;
	}

	let mayAddItem = $derived(
		editable &&
			$mayCreateContainer(container.payload.objectType, container) &&
			(bound
				? useTemplates && templateResource.current !== undefined
				: templateAvailability.has(container.payload.objectType))
	);

	function addItem() {
		if (!mayAddItem) {
			return;
		}

		const item = createItem();
		const template = templateResource.current;

		if (bound && template) {
			const instance = createTemplateInstanceOf(
				template,
				container.organization,
				container.organizational_unit ?? null
			);
			instance.managed_by = item.managed_by;
			instance.relation = item.relation;
			if ('category' in instance.payload && 'category' in item.payload) {
				instance.payload.category = { ...instance.payload.category, ...item.payload.category };
			}
			openContainerCopyDialog(instance, {
				operation: 'template-instance',
				availableIn: parentContainer.guid,
				sourceGuid: template.guid,
				targetOrganizationGuid: container.organization,
				targetOrganizationalUnitGuid: container.organizational_unit ?? null
			});
		} else if (!bound) {
			$newContainer = item;
		} else {
			return;
		}

		$addItemState = { target: container };
		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if editable && $ability.can('update', container)}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				id={idForTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('title')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if mayAddItem}
				<li>
					<button
						class="action-button action-button--size-l"
						onclick={addItem}
						type="button"
						{@attach tooltip($_('add_item'))}
					>
						<Plus />
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#snippet card(item: Container<AnyPayload>, height?: string)}
	<Card
		--height={height}
		container={item}
		ignoreBulkActionContext
		relatedContainers={relatedContainers.filter(
			({ payload, relation }) =>
				payload.type === payloadTypes.enum.indicator_template ||
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
		)}
	/>
{/snippet}

{#if container.payload.listType === listTypes.enum.carousel}
	<Carousel {addItem} {items} {mayAddItem}>
		{#snippet itemSnippet(item)}
			{@render card(item)}
		{/snippet}
	</Carousel>
{:else}
	<ul class="catalog wide">
		{#each items as item (item.guid)}
			<li>
				{@render card(item, '100%')}
			</li>
		{/each}
		{#if mayAddItem}
			<li>
				<button class="card" onclick={addItem} type="button" {@attach tooltip($_('add_item'))}>
					<CirclePlus />
				</button>
			</li>
		{/if}
	</ul>
{/if}

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		height: 100%;
		justify-content: center;
		min-height: 6rem;
		width: 100%;
	}

	.card :global(svg) {
		height: 2.25rem;
		width: 2.25rem;
	}
</style>
