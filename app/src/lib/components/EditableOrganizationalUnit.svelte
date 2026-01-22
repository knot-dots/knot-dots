<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationalUnitDropdown from '$lib/components/OrganizationalUnitDropdown.svelte';

	interface Props {
		editable?: boolean;
		organization: string;
		value: string | null;
	}

	let { editable = false, organization, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('organizational_unit')}</div>
<OrganizationalUnitDropdown {editable} labelledBy={id} {organization} bind:value />
