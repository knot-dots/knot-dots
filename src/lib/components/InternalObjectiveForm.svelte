<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type {
		AnyContainer,
		EmptyInternalObjectiveContainer,
		InternalObjectiveContainer
	} from '$lib/models';

	export let container: InternalObjectiveContainer | EmptyInternalObjectiveContainer;
	export let isPartOfOptions: AnyContainer[];
</script>

<Editor label={$_('description')} bind:value={container.payload.description} />

<RelationSelector {container} {isPartOfOptions} />
