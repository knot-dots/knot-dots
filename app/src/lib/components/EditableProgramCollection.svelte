<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		type AnyContainer,
		titleForProgramCollection,
		containerOfType,
		type NewContainer,
		payloadTypes,
		type ProgramCollectionContainer,
		type ProgramContainer
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: ProgramCollectionContainer;
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

	const programsResource = resource(
		[() => parentContainer, () => inViewportOnce],
		async (_, __, { signal }) => {
			if (!inViewportOnce) return [] as AnyContainer[];
			return fetchContainers(
				{
					payloadType: [payloadTypes.enum.program],
					organization: [container.organization],
					...(container.organizational_unit
						? { organizationalUnit: [container.organizational_unit] }
						: {})
				},
				'alpha',
				{ signal }
			);
		},
		{ lazy: true }
	);

	let items = $state<AnyContainer[]>([]);
	$effect(() => {
		if (programsResource.current !== undefined) {
			items = programsResource.current;
		}
	});

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		$newContainer = containerOfType(
			payloadTypes.enum.program,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		createContainerDialog.getElement().showModal();
	}
</script>

<header bind:this={header}>
	<svelte:element this={heading} class="details-heading">
		{titleForProgramCollection(items as ProgramContainer[])}
	</svelte:element>

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
		<Card container={item} />
	{/snippet}
</Carousel>
