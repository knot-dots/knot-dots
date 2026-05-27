<script lang="ts">
	import { _ } from 'svelte-i18n';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import { type Status, status } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: Status;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const options = status.options.filter((s) => s !== 'status.in_operation');
</script>

<div class="label">{$_('status')}</div>
<StatusDropdown {editable} {options} bind:value />
