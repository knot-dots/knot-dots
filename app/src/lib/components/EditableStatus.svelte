<script lang="ts">
	import { _ } from 'svelte-i18n';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import type { Status } from '$lib/models';

	export let editable = false;
	export let value: Status;
</script>

<div class="label">{$_('status')}</div>
<StatusDropdown {editable} bind:value />
