<script lang="ts">
	import Dropdown from '$lib/components/Dropdown.svelte';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value: string;
	}

	let { editable = false, offset = [-24, -39], value = $bindable() }: Props = $props();

	function init(element: HTMLElement) {
		element.focus();
	}
</script>

<Dropdown --dropdown-panel-width="min(80vw, 44rem)" {offset}>
	{#snippet button(popover)}
		<button class="dropdown-button truncated" type="button" use:popover.button>
			{value}
		</button>
	{/snippet}

	{#snippet panel()}
		{#if editable}
			<h3
				contenteditable="plaintext-only"
				onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				bind:textContent={value}
				use:init
			></h3>
		{:else}
			<h3 class="truncated">{value}</h3>
		{/if}
	{/snippet}
</Dropdown>

<style>
	h3 {
		color: var(--color-gray-900);
		font-size: inherit;
		font-weight: 500;
		margin-bottom: 0;
		padding: 0.75rem 1rem;
	}

	.dropdown-button {
		color: var(--color-gray-900);
		display: block;
		font-size: inherit;
		font-weight: 500;
		text-align: left;
	}
</style>
