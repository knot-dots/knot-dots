<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		containerOfType,
		type IndicatorCollectionContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isIndicatorContainer,
		type NewContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: IndicatorCollectionContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
		subsection?: boolean;
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable(),
		subsection = false
	}: Props = $props();

	let items = $derived(relatedContainers.filter(isIndicatorContainer));

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		$newContainer = containerOfType(
			payloadTypes.enum.indicator,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	{#if subsection}
		<h3 class="details-heading">{$_('indicators')}</h3>
	{:else}
		<h2 class="details-heading">{$_('indicators')}</h2>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.goal, container.managed_by)}
				<li>
					<button
						aria-label={$_('add_item')}
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

<Carousel
	{addItem}
	{items}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.indicator, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={[
				...relatedContainers.filter(({ relation }) =>
					relation.some(({ object }) => object === item.guid)
				),
				...relatedContainers.filter(isContainerWithEffect),
				...relatedContainers.filter(isContainerWithObjective)
			]}
		/>
	{/snippet}
</Carousel>
