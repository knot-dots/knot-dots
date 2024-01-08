<script lang="ts">
	import { Icon, type IconSource } from 'svelte-hero-icons';
	import { page } from '$app/stores';
	import { sidebarToggle } from '$lib/stores.js';

	export let href: string;
	export let iconSource: IconSource;
	export let text: string;
</script>

<li>
	<a class="button" class:is-active={$page.url.pathname === href} {href}>
		<Icon src={iconSource} size="20" mini />
		<span class:is-hidden={!$sidebarToggle}>{text}</span>
	</a>
</li>
