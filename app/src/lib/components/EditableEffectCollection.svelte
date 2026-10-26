<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import ObjectiveOrEffectCard from '$lib/components/ObjectiveOrEffectCard.svelte';
	import {
		getCreateEffectDialogContext,
		hasCreateEffectDialogContext
	} from '$lib/contexts/createEffectDialog.svelte';
	import {
		type AnyPayload,
		type Container,
		type EffectCollectionPayload,
		type GoalPayload,
		isEffectContainer,
		isPartOf,
		type MeasurePayload,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	interface Props {
		container: Container<EffectCollectionPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<GoalPayload | MeasurePayload>;
		relatedContainers: Container<AnyPayload>[];
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

	// The dialog is provided by the page layout, which embedded views lack.
	const createEffectDialog = hasCreateEffectDialogContext()
		? getCreateEffectDialogContext()
		: undefined;

	let mayAddItem = $derived(
		editable &&
			createEffectDialog !== undefined &&
			$mayCreateContainer(payloadTypes.enum.effect, container)
	);

	function addItem() {
		if (!parentContainer) {
			return;
		}

		createEffectDialog?.open({ target: parentContainer });
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{$_('effects')}</svelte:element>

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

<Carousel {addItem} {items} {mayAddItem}>
	{#snippet itemSnippet(item)}
		<ObjectiveOrEffectCard
			container={item}
			ignoreBulkActionContext
			relatedContainers={relatedContainers.filter(({ relation }) =>
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
