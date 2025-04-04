<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationDropdown from '$lib/components/OrganizationDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() } = $props();
</script>

<div class="tabular">
	<span class="label">{$_('organization')}</span>
	<div class="value">
		<OrganizationDropdown {editable} bind:value />
	</div>
</div>
