<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ProgramStatusDropdown from '$lib/components/ProgramStatusDropdown.svelte';
	import type { ProgramStatus } from '$lib/models';

	export let editable = false;
	export let value: ProgramStatus;
</script>

<div class="label">{$_('program_status')}</div>
<ProgramStatusDropdown {editable} bind:value />
