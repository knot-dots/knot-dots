<script lang="ts">
	import { page } from '$app/state';
	import requestSubmit from '$lib/client/requestSubmit';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string | null;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		handleChange={requestSubmit}
		offset={[0, -39]}
		options={page.data.organizationalUnits.map(({ guid, payload }) => ({
			value: guid,
			label: payload.name
		}))}
		bind:value
	/>
{:else}
	<span class="value">
		{page.data.organizationalUnits.find(({ guid }) => guid === value)?.payload.name}
	</span>
{/if}
