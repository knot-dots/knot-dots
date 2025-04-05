<script lang="ts">
	import { page } from '$app/state';
	import requestSubmit from '$lib/client/requestSubmit';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		handleChange={requestSubmit}
		offset={[-41, -39]}
		options={page.data.organizations.map(({ guid, payload }) => ({
			value: guid,
			label: payload.name
		}))}
		bind:value
	/>
{:else}
	<div class="value">
		{page.data.organizations.find(({ guid }) => guid === value)?.payload.name}
	</div>
{/if}
