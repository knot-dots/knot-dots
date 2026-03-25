<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type GoalContainer,
		isObjectiveContainer,
		isPartOf,
		type ObjectiveCollectionContainer,
		payloadTypes
	} from '$lib/models';
	import { addObjectiveState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: ObjectiveCollectionContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: GoalContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let items = $derived(
		parentContainer
			? relatedContainers.filter(isObjectiveContainer).filter(isPartOf(parentContainer))
			: []
	);

	async function addItem() {
		if (!parentContainer) {
			return;
		}

		$addObjectiveState = { target: parentContainer };

		pushState(page.url, { createObjectiveOrEffect: { step: 1 } });
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{$_('objectives')}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.objective, container.managed_by)}
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

<Carousel
	{addItem}
	{items}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.objective, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={relatedContainers.filter(({ relation }) =>
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
