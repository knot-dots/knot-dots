<script lang="ts">
	import CategoryTerms from '$lib/components/CategoryTerms.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import type { TemplateCopyPreview } from '$lib/containerCopy';
	import {
		isCategoryContainer,
		isContainer,
		isProgramContainer,
		predicates,
		type Container
	} from '$lib/models';

	interface Props {
		preview: TemplateCopyPreview;
	}

	let { preview }: Props = $props();

	// The preview endpoint already excludes program-scoped template branches. Main-hierarchy
	// descendants may themselves carry template=true, so filtering by that flag would hide content
	// that will actually be instantiated.
	let relatedContainers = $derived(preview.containers.filter(isContainer));
	let root = $derived(relatedContainers.find(({ guid }) => guid === preview.rootGuid));
	let programParts = $derived.by(() => {
		if (!root || !isProgramContainer(root)) {
			return [];
		}

		const position = (container: Container) =>
			container.relation.find(
				({ object, predicate, subject }) =>
					object === root?.guid &&
					predicate === predicates.enum['is-part-of-program'] &&
					subject === container.guid
			)?.position ?? 0;

		return relatedContainers
			.filter(({ guid, relation }) =>
				relation.some(
					({ object, predicate, subject }) =>
						object === root?.guid &&
						predicate === predicates.enum['is-part-of-program'] &&
						subject === guid
				)
			)
			.toSorted((a, b) => position(a) - position(b));
	});
</script>

{#if root}
	<section class="template-content">
		{#if isProgramContainer(root)}
			<div class="chapters">
				{#each programParts as part (part.guid)}
					<section class="details-section">
						<EditableChapter
							container={part}
							editable={false}
							isPartOf={root}
							{relatedContainers}
							showActions={false}
							useForms={false}
						/>
					</section>
				{/each}
			</div>
		{:else if isCategoryContainer(root)}
			<CategoryTerms container={root} editable={false} {relatedContainers} />
		{:else}
			<Sections container={root} editable={false} {relatedContainers} useForms={false} />
		{/if}
	</section>
{/if}

<style>
	.template-content {
		border-top: 0.0625rem solid var(--color-border-subtle);
		margin-top: 1.5rem;
		padding-top: 1.5rem;
	}

	.details-section {
		--details-section-padding-x: 1.5rem;
		--details-section-padding-y: 1.5rem;
	}
</style>
