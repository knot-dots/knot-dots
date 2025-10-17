<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';

	interface Props {
		editable?: boolean;
		organization: string;
		value: string | null;
	}

	let { editable = false, organization, value = $bindable() }: Props = $props();
</script>

<div class="label">{$_('organizational_unit')}</div>
<OrganizationalUnitDropdown {editable} {organization} bind:value />
