<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { AnyContainer, EmptyModelContainer, ModelContainer } from '$lib/models';

	export let container: ModelContainer | EmptyModelContainer;
	export let isPartOfOptions: AnyContainer[];
</script>

<label>
	{$_('summary')}
	<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
</label>

<Editor label={$_('description')} bind:value={container.payload.description} />

<ListBox label={$_('topic.label')} options={topics.options} bind:value={container.payload.topic} />

<ListBox
	label={$_('category')}
	options={sustainableDevelopmentGoals.options}
	bind:value={container.payload.category}
/>

<RelationSelector {container} {isPartOfOptions} />
