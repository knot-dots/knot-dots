<script lang="ts">
	import { page } from '$app/state';
	import CustomCategoryDropdown from '$lib/components/CustomCategoryDropdown.svelte';
	import type { AnyPayload, Container } from '$lib/models';

	interface Props {
		container: Container<AnyPayload> & { payload: { category: Record<string, string[]> } };
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

{#each page.data.categoryContext.keys as key (key)}
	{#if page.data.categoryContext.objectTypesPerKey[key].some((t) => t === container.payload.type)}
		{@const id = crypto.randomUUID()}
		<div class="label" {id}>{page.data.categoryContext.labels.get(key)}</div>
		<CustomCategoryDropdown
			bind:value={
				() => container.payload.category[key] ?? '', (v) => (container.payload.category[key] = v)
			}
			{editable}
			labelledBy={id}
			options={page.data.categoryContext.options[key] ?? []}
		/>
	{/if}
{/each}
