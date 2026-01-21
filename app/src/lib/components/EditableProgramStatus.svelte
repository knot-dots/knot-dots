<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ProgramStatusDropdown from '$lib/components/ProgramStatusDropdown.svelte';
	import type { ProgramStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: ProgramStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('program_status')}</div>
<ProgramStatusDropdown {editable} labelledBy={id} bind:value />
