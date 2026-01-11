<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		organization: string;
		value: string | null;
	}

	let { editable = false, labelledBy, organization, value = $bindable() }: Props = $props();

	let options = $derived([
		{ label: $_('empty'), value: null },
		...page.data.organizationalUnits
			.filter((ou) => ou.organization == organization)
			.map(({ guid, payload }) => ({
				value: guid,
				label: payload.name
			}))
	]);
</script>

{#if editable}
	<SingleChoiceDropdown {labelledBy} offset={[0, -39]} {options} bind:value />
{:else}
	<span class="value">
		{page.data.organizationalUnits.find(({ guid }) => guid === value)?.payload.name ?? $_('empty')}
	</span>
{/if}
