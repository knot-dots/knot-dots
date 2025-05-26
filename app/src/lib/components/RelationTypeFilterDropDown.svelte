<script lang="ts">
	import { _ } from 'svelte-i18n';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';

	interface Props {
		options: Array<{ count: number; label: string; value: string }>;
	}

	let { options }: Props = $props();
</script>

<FilterDropDown
	key="relationType"
	options={options.map(({ value }) => ({
		label: $_(`relation_filter.option.${value.replaceAll('-', '_')}`),
		value
	}))}
/>
