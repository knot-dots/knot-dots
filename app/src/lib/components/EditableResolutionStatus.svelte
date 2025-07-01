<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ResolutionStatusDropdown from '$lib/components/ResolutionStatusDropdown.svelte';
	import type { ResolutionStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: ResolutionStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('resolution_status')}</div>
<ResolutionStatusDropdown {editable} bind:value />
