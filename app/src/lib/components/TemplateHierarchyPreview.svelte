<script lang="ts">
	import CategoryTerms from '$lib/components/CategoryTerms.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import type { TemplateCopyPreview } from '$lib/containerCopy';
	import { isCategoryContainer, isContainer } from '$lib/models';

	interface Props {
		preview: TemplateCopyPreview;
	}

	let { preview }: Props = $props();

	// The preview endpoint already excludes program-scoped template branches. Main-hierarchy
	// descendants may themselves carry template=true, so filtering by that flag would hide content
	// that will actually be instantiated.
	let relatedContainers = $derived(preview.containers.filter(isContainer));
	let root = $derived(relatedContainers.find(({ guid }) => guid === preview.rootGuid));
</script>

{#if root}
	<section class="template-content">
		{#if isCategoryContainer(root)}
			<CategoryTerms container={root} editable={false} {relatedContainers} />
		{:else}
			<Sections container={root} editable={false} preview={true} {relatedContainers} />
		{/if}
	</section>
{/if}

<style>
	.template-content {
		border-top: 0.0625rem solid var(--color-border-subtle);
		margin-top: 1.5rem;
		padding-top: 1.5rem;
	}
</style>
