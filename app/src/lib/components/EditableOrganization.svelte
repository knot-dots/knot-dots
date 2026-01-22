<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationDropdown from '$lib/components/OrganizationDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('organization')}</div>
<OrganizationDropdown {editable} labelledBy={id} bind:value />
