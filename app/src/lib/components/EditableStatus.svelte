<script lang="ts">
	import { _ } from 'svelte-i18n';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import type { Status } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: Status;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	function labelFn(s: Status): string {
		if (s === 'status.in_operation') return $_('status.in_operation.short');
		return $_(s);
	}
</script>

<div class="label">{$_('status')}</div>
<StatusDropdown {editable} {labelFn} bind:value />
