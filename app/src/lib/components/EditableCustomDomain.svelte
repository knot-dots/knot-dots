<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value?: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();

	function oninput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;

		console.log(input.validity);

		if (!input.validity.valid) {
			event.stopPropagation();
		}

		value = input.value;
	}
</script>

{#if editable}
	<label class="label" for={id}>{$_('custom_domain')}</label>
	<input
		class="value"
		{id}
		{oninput}
		pattern="([0-9a-zA-Z\-]+\.)+[a-zA-Z][a-zA-Z]+"
		placeholder="musterhausen.de"
		type="text"
		{value}
	/>
{:else}
	<span class="label">{$_('custom_domain')}</span>
	<span class="value">{value}</span>
{/if}

<style>
	input {
		border: none;
	}
</style>
