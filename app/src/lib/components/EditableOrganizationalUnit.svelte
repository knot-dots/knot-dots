<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() } = $props();
</script>

<div class="label">{$_('organizational_unit')}</div>
<OrganizationalUnitDropdown {editable} bind:value />
