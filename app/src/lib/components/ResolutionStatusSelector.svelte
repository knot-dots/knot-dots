<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { resolutionStatus } from '$lib/models';

	export let value: string | undefined;
</script>

<div class="meta">
	<p class="meta-key">{$_('resolution_status')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('resolution_status')}
			options={resolutionStatus.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
