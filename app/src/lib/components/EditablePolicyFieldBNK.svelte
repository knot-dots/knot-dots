<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PolicyFieldBNKDropdown from '$lib/components/PolicyFieldBNKDropdown.svelte';

	export let editable = false;
	export let value: string[];
</script>

<div class="label">{$_('policy_field_bnk')}</div>
<PolicyFieldBNKDropdown {editable} bind:value />
