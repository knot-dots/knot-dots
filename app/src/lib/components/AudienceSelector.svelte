<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { audience } from '$lib/models';

	export let value: string[];
</script>

<div class="meta">
	<p class="meta-key">{$_('audience')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('audience')}
			options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
