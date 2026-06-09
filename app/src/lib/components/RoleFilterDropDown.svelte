<script lang="ts">
	import { _ } from 'svelte-i18n';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';

	interface Props {
		options: Array<{ count: number; label: string; value: string }>;
	}

	let { options }: Props = $props();

	const roles = ['administrator', 'head', 'collaborator', 'observer'] as const;
</script>

<FilterDropDown
	key="role"
	label={$_('user.role')}
	options={roles.map((role) => ({
		count: options.find(({ value }) => value === role)?.count ?? 0,
		label: $_(`role.${role}`),
		value: role
	}))}
/>
