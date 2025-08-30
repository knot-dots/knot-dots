<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PolicyFieldBNKDropdown from '$lib/components/PolicyFieldBNKDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('policy_field_bnk')}</div>
<PolicyFieldBNKDropdown {editable} bind:value />
