<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		value: string;
	}

	let { editable = false, labelledBy, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		{labelledBy}
		offset={[-41, -39]}
		options={page.data.organizations.map(({ guid, payload }) => ({
			value: guid,
			label: payload.name
		}))}
		bind:value
	/>
{:else}
	<div class="value">
		{page.data.organizations.find(({ guid }) => guid === value)?.payload.name ?? $_('empty')}
	</div>
{/if}
