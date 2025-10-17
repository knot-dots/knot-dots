<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationDropdown from '$lib/components/OrganizationDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('organization')}</div>
<OrganizationDropdown {editable} bind:value />
