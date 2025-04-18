<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import requestSubmit from '$lib/client/requestSubmit';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		organization: string;
		value: string | null;
	}

	let { editable = false, organization, value = $bindable() }: Props = $props();

	let options = $derived(
		page.data.organizationalUnits
			.filter((ou) => ou.organization == organization)
			.map(({ guid, payload }) => ({
				value: guid,
				label: payload.name
			}))
	);
</script>

{#if editable}
	<SingleChoiceDropdown handleChange={requestSubmit} offset={[0, -39]} {options} bind:value />
{:else}
	<span class="value">
		{page.data.organizationalUnits.find(({ guid }) => guid === value)?.payload.name ?? $_('empty')}
	</span>
{/if}
