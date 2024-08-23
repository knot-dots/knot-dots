<script lang="ts">
	import type { SvelteComponent } from 'svelte';
	import type { SVGAttributes } from 'svelte/elements';
	import { page } from '$app/stores';

	export let href: string;
	export let iconSource: typeof SvelteComponent<SVGAttributes<SVGSVGElement>>;
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
