<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { organizationCategories } from '$lib/models';

	export let editable = false;
	export let value: string | undefined;
</script>

<EditableSingleChoice
	{editable}
	label={$_('organization_category.label')}
	options={organizationCategories.options.map((o) => ({ label: $_(o), value: o }))}
	bind:value
/>
