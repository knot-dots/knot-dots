<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ResolutionStatusDropdown from '$lib/components/ResolutionStatusDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('resolution_status')}</div>
<ResolutionStatusDropdown {editable} bind:value />
