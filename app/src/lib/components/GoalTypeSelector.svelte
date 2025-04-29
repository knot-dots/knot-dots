<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { goalType } from '$lib/models';

	export let value: string | undefined;
</script>

<div class="meta">
	<p class="meta-key">{$_('goal_type')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('goal_type')}
			options={[
				{ label: $_('empty'), value: undefined },
				...goalType.options.map((o) => ({ value: o, label: $_(o) }))
			]}
			bind:value
		/>
	</div>
</div>
