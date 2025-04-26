<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { editorialState } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		offset={[-41, -39]}
		options={[
			{ label: $_('empty'), value: undefined },
			...editorialState.options.map((o) => ({ label: $_(o), value: o }))
		]}
		bind:value
	/>
{:else}
	<div class="value">
		{value ? $_(value) : $_('empty')}
	</div>
{/if}
