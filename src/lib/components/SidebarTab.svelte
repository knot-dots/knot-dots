<script lang="ts">
	import { Icon, type IconSource } from 'svelte-hero-icons';
	import { page } from '$app/stores';

	export let href: string;
	export let iconSource: IconSource;
	export let text: string;
</script>

<li>
	<a
		class="button button-nav button-square"
		class:is-active={$page.url.pathname === href}
		{href}
		title={text}
	>
		<Icon src={iconSource} size="20" mini />
	</a>
</li>
