<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { sustainableDevelopmentGoals } from '$lib/models';

	interface Props {
		handleChange: (event: Event) => void;
		value: string[];
	}

	let { handleChange, value = $bindable() }: Props = $props();
</script>

<MultipleChoiceDropdown
	{handleChange}
	options={sustainableDevelopmentGoals.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
