<script lang="ts">
	import requestSubmit from '$lib/client/requestSubmit';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	export let editable = false;
	export let handleChange: (event: Event) => void = requestSubmit;
	export let label: string;
	export let options: Array<{ href?: string; label: string; value: string | undefined }>;
	export let value: string | undefined;

	$: selected = options.find((o) => o.value == value);
</script>

<div class="tabular">
	<span class="label">{label}</span>
	{#if editable}
		<SingleChoiceDropdown {handleChange} {options} bind:value />
	{:else}
		<span class="value">
			{#if selected}
				{#if selected.href}
					<a href={selected.href}>{selected.label}</a>
				{:else}
					{selected.label}
				{/if}
			{:else}
				&nbsp;
			{/if}
		</span>
	{/if}
</div>
