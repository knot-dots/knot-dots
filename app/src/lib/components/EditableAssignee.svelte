<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import { displayName, type User } from '$lib/models';

	interface Props {
		candidatesPromise: Promise<User[]>;
		editable: boolean;
		value: string[];
	}

	let { candidatesPromise, editable = false, value = $bindable() }: Props = $props();
</script>

{#await candidatesPromise}
	<EditableMultipleChoice {editable} label={$_('assignee')} options={[]} value={[]} />
{:then candidates}
	<EditableMultipleChoice
		{editable}
		label={$_('assignee')}
		options={candidates
			.filter(({ family_name }) => family_name !== '')
			.map((m) => ({ value: m.guid, label: displayName(m) }))}
		bind:value
	/>
{/await}
