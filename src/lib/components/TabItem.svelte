<script lang="ts">
	import { getContext } from 'svelte';
	import { writable } from 'svelte/store';
	import type { TabCtxType } from './Tabs.svelte';

	export let open: boolean = false;
	export let title: string = 'Tab title';

	const ctx = getContext<TabCtxType>('ctx') ?? {};
	const selected = ctx.selected ?? writable<HTMLElement>();

	function init(node: HTMLElement) {
		selected.set(node);

		const destroy = selected.subscribe((x) => {
			if (x !== node) {
				open = false;
			}
		});

		return { destroy };
	}

	function handleClick() {
		open = true;
	}
</script>

<li role="presentation">
	<button
		class="badge"
		class:badge--large={open}
		type="button"
		on:click={() => handleClick()}
		role="tab"
		{...$$restProps}
	>
		<slot name="title">{title}</slot>
	</button>

	{#if open}
		<div use:init>
			<slot />
		</div>
	{/if}
</li>

<style>
	li {
		align-items: center;
		display: flex;
	}

	button {
		border: none;
	}

	button:hover {
		background-color: var(--color-indigo-050);
	}
</style>
