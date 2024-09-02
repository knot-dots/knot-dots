<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { chapterTypeOptions } from '$lib/models';

	export let value: string[];
</script>

<ListBox
	label={$_('chapter_type')}
	options={chapterTypeOptions.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
