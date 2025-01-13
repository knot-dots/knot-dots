<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { audience } from '$lib/models';

	interface Props {
		value: string[];
	}

	let { value = $bindable() }: Props = $props();
</script>

<MultipleChoiceDropdown
	handleChange={requestSubmit}
	options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
