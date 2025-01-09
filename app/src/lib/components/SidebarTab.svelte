<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { page } from '$app/stores';

	export let href: string;
	export let iconSource: Component<SvelteHTMLElements['svg']>;
	export let text: string;
</script>

<li>
	<a
		class="button button-nav button-square"
		class:is-active={$page.url.pathname === href}
		{href}
		title={text}
	>
		<svelte:component this={iconSource} />
	</a>
</li>
