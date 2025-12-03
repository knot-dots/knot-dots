<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ProgramStatusDropdown from '$lib/components/ProgramStatusDropdown.svelte';
	import type { ProgramStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: ProgramStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('program_status')}</div>
<ProgramStatusDropdown {editable} bind:value />
