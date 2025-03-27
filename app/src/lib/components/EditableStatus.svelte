<script lang="ts">
	import { _ } from 'svelte-i18n';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';

	export let editable = false;
	export let value: string;
</script>

<div class="tabular">
	<span class="label">{$_('status')}</span>
	<div class="value">
		<StatusDropdown {editable} bind:value />
	</div>
</div>
