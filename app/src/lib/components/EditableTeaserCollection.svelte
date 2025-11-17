<script lang="ts">
  import {getContext} from 'svelte';
  import {_} from 'svelte-i18n';
  import Plus from '~icons/knotdots/plus';
  import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
  import TeaserCard from "$lib/components/TeaserCard.svelte";
  import Wall from '$lib/components/Wall.svelte';
  import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
  import {
    type AnyContainer,
    containerOfType,
    predicates,
    isTeaserContainer,
    isTeaserCollectionContainer,
    type TeaserContainer,
    type TeaserCollectionContainer,
    type NewContainer,
    payloadTypes
  } from '$lib/models';
  import {sectionOf} from '$lib/relations';
  import {mayCreateContainer, newContainer} from '$lib/stores';

  interface Props {
    container: TeaserCollectionContainer;
    editable?: boolean;
    relatedContainers: AnyContainer[];
  }

  let {
    container = $bindable(),
    editable = false,
    relatedContainers = $bindable(),
  }: Props = $props();

  let parentContainer = $derived(sectionOf(container, relatedContainers));

  let teaserRequest = $derived(
    fetchRelatedContainers(container.guid, {
      payloadType: [payloadTypes.enum.teaser],
      relationType: [predicates.enum['is-part-of']]
    })
  ) as Promise<TeaserContainer[]>;

  const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
    'createContainerDialog'
  );

  function addItem() {
    if (!parentContainer) {
      return;
    }

    const item = containerOfType(
      payloadTypes.enum.teaser,
      container.organization,
      container.organizational_unit,
      container.managed_by,
      container.realm
    ) as NewContainer;


    item.relation = [
      {object: container.guid, position: 0, predicate: predicates.enum['is-part-of']},
      ...parentContainer.relation
        .filter(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
        .map(({ object }) => ({
          object,
          position: 0,
          predicate: predicates.enum['is-part-of-measure']
        }))
    ];

    $newContainer = item;

    createContainerDialog.getElement().showModal();
  }
</script>

<header>
	<h2 class="details-heading">{container.payload.title}</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.teaser, container.managed_by)}
				<li>
					<button
							aria-label={$_('add_item')}
							class="action-button action-button--size-l"
							onclick={addItem}
							type="button"
					>
						<Plus/>
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers/>
			</li>
		</ul>
	{/if}
</header>

{#await teaserRequest then items}
	<Wall
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.teaser, container.managed_by) && editable}
	>
		{#snippet itemSnippet(item)}
			<TeaserCard container={item}/>
		{/snippet}
	</Wall>
{/await}
