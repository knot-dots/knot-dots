<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { levels } from '$lib/models.js';

	export let value: string | undefined;
</script>

<div class="meta">
	<p class="meta-key">{$_('level.label')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('level.label')}
			options={levels.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
