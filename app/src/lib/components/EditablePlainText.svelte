<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	let timer: ReturnType<typeof setTimeout>;

	function debouncedSubmit(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			input.closest('form')?.requestSubmit();
		}, 2000);
	}
</script>

{#if label}
	<div class="label">{label}</div>
{/if}
{#if editable}
	<input class="value" onchange={debouncedSubmit} type="text" bind:value />
{:else}
	<div class="value">
		{value ?? $_('empty')}
	</div>
{/if}

<style>
	input {
		border: none;
	}
</style>
