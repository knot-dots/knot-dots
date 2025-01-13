<script lang="ts">
	import { page } from '$app/state';
	import requestSubmit from '$lib/client/requestSubmit';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		value: string | null;
	}

	let { value = $bindable() }: Props = $props();
</script>

<SingleChoiceDropdown
	handleChange={requestSubmit}
	options={page.data.organizationalUnits.map(({ guid, payload }) => ({
		value: guid,
		label: payload.name
	}))}
	bind:value
/>
