<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import {
		type AnyContainer,
		containerOfType,
		type GoalCollectionContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: GoalCollectionContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable()
	}: Props = $props();

	let header = $state<HTMLElement>();
	const inViewport = new IsInViewport(() => header);
	let inViewportOnce = $state(false);
	$effect(() => {
		if (inViewport.current) {
			inViewportOnce = true;
		}
	});

	const goalsResource = resource(
		[() => parentContainer, () => inViewportOnce],
		async ([parent], _, { signal }) => {
			if (!parent || !inViewportOnce) return [] as AnyContainer[];
			return fetchRelatedContainers(
				parent.guid,
				{ payloadType: [payloadTypes.enum.goal] },
				'alpha',
				{ signal }
			);
		},
		{ lazy: true }
	);

	let items = $state<AnyContainer[]>([]);
	$effect(() => {
		if (goalsResource.current !== undefined) {
			items = goalsResource.current;
		}
	});

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		if (!parentContainer) {
			return;
		}

		const item = containerOfType(
			payloadTypes.enum.goal,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		item.relation = [
			{ object: parentContainer.guid, position: 0, predicate: predicates.enum['is-part-of'] },
			{
				object: parentContainer.guid,
				position: 0,
				predicate: predicates.enum['is-part-of-measure']
			}
		];

		$newContainer = item;

		createContainerDialog.getElement().showModal();
	}
</script>

<header bind:this={header}>
	<svelte:element this={heading} class="details-heading">{$_('goals')}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.goal, container.managed_by)}
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
				<ContainerSettingsDropdown
					bind:container
					bind:parentContainer
					bind:relatedContainers={items}
				/>
			</li>
		</ul>
	{/if}
</header>

<Carousel
	{addItem}
	{items}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.goal, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={items.filter(({ relation }) =>
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
