<script lang="ts">
	import { _ } from 'svelte-i18n';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';

	export let editable = false;
	export let value: string;
</script>

<div class="label">{$_('status')}</div>
<StatusDropdown {editable} bind:value />
