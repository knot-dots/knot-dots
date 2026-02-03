<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		options: Array<{ href?: string; label: string; value: string | undefined }>;
		value: string | undefined;
	}

	let { editable = false, label, options, value = $bindable() }: Props = $props();

	let selected = $derived(options.find((o) => o.value == value));

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{label}</div>
{#if editable}
	<SingleChoiceDropdown labelledBy={id} {options} bind:value />
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
