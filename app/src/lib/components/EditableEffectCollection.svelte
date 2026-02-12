<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type EffectCollectionContainer,
		type GoalContainer,
		isEffectContainer,
		isPartOf,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { addEffectState, mayCreateContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: EffectCollectionContainer;
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
			? relatedContainers.filter(isEffectContainer).filter(isPartOf(parentContainer))
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

		if ('sdg' in parentContainer.payload) {
			for (const sdg of parentContainer.payload.sdg) {
				params.append('sdg', sdg);
			}
		}

		if ('topic' in parentContainer.payload) {
			for (const topic of parentContainer.payload.topic) {
				params.append('topic', topic);
			}
		}

		$addEffectState = { target: parentContainer };

		await goto(`#${params.toString()}`);
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{$_('effects')}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.effect, container.managed_by)}
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
	mayAddItem={$mayCreateContainer(payloadTypes.enum.effect, container.managed_by) && editable}
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
