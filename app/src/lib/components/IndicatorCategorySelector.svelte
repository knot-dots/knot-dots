<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { indicatorCategories } from '$lib/models';

	export let value: string[];
</script>

<div class="meta">
	<p class="meta-key">{$_('indicator_category')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('indicator_category')}
			options={indicatorCategories.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
