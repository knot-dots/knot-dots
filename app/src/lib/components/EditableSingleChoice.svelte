<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	export let editable = false;
	export let label: string;
	export let options: Array<{ href?: string; label: string; value: string | undefined }>;
	export let value: string | undefined;

	$: selected = options.find((o) => o.value == value);
</script>

<div class="label">{label}</div>
{#if editable}
	<SingleChoiceDropdown {options} bind:value />
{:else}
	<div class="value">
		{#if selected}
			{#if selected.href}
				<a href={selected.href}>{selected.label}</a>
			{:else}
				{selected.label}
			{/if}
		{:else}
			{$_('empty')}
		{/if}
	</div>
{/if}
