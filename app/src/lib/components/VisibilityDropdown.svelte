<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { visibility } from '$lib/models';

	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();
</script>

<SingleChoiceDropdown
	handleChange={requestSubmit}
	options={visibility.options.map((o) => ({ value: o, label: $_(`visibility.${o}`) }))}
	bind:value
/>
