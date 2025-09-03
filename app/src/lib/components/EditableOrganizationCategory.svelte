<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { organizationCategories } from '$lib/models';

	interface Props {
		editable?: boolean;
		value?: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<EditableSingleChoice
	{editable}
	label={$_('organization_category.label')}
	options={organizationCategories.options.map((o) => ({ label: $_(o), value: o }))}
	bind:value
/>
