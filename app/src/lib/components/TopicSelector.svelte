<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { topics } from '$lib/models';

	export let value: string[];
</script>

<div class="meta">
	<p class="meta-key">{$_('topic.label')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('topic.label')}
			options={topics.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
