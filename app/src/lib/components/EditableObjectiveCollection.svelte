<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		isGoalContainer,
		isObjectiveContainer,
		isPartOf,
		type ObjectiveCollectionContainer,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { sectionOf } from '$lib/relations';
	import { addObjectiveState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: ObjectiveCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers.filter(isGoalContainer)));

	let items = $derived(
		parentContainer
			? relatedContainers.filter(isObjectiveContainer).filter(isPartOf(parentContainer))
			: []
	);

	async function addItem() {
		if (!parentContainer) {
			return;
		}

		const params = new URLSearchParams([
			[overlayKey.enum['indicator-catalog'], ''],
			['alreadyInUse', '']
		]);

		if ('category' in parentContainer.payload) {
			for (const category of parentContainer.payload.category) {
				params.append('category', category);
			}
		}

		if ('topic' in parentContainer.payload) {
			for (const topic of parentContainer.payload.topic) {
				params.append('topic', topic);
			}
		}

		$addObjectiveState = { target: parentContainer };

		await goto(`#${params.toString()}`);
	}
</script>

<header>
	<h2 class="details-heading">{$_('objectives')}</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.objective, container.managed_by)}
				<li>
					<button
						aria-label={$_('add_item')}
						class="action-button action-button--size-l"
						onclick={addItem}
						type="button"
					>
						<Plus />
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers />
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
