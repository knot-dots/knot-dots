<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import logo1 from '$lib/assets/logo-1.svg';
	import logo2 from '$lib/assets/logo-2.svg';
	import logo3 from '$lib/assets/logo-3.svg';

	export let linkPath = '/';

	const logos = [logo1, logo2, logo3];
	const logo = logos[Math.floor($page.data.random * logos.length)];

	let organizationLink: HTMLAnchorElement;

	function handleClick(event: MouseEvent) {
		if (organizationLink == event.target) {
			return;
		}
		const isTextSelected = window.getSelection()?.toString();
		if (!isTextSelected) {
			organizationLink.click();
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			organizationLink.click();
		}
	}

	function url() {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		url.hostname = `${url.hostname}`;
		url.pathname = linkPath;
		return url.toString();
	}
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<article
	tabindex="-1"
	title="knotdots.net"
	data-sveltekit-keepfocus
	class="card"
	on:click={handleClick}
	on:keyup={handleKeyUp}
>
	<header>
		<h3>
			<a href={url()} bind:this={organizationLink}>knotdots.net</a>
		</h3>
	</header>
	<p class="text">{$_('show_all_organizations')}</p>
	<img alt={$_('image')} src={logo} />
</article>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		padding: 1.25rem;
		height: var(--height, auto);
		width: 100%;
	}

	.card:hover {
		border-color: var(--hover-border-color, var(--color-hover-neutral));
		border-width: 3px;
		outline: none;
		padding: calc(1.25rem - 2px);
	}

	header h3 {
		font-size: 1rem;
		font-weight: 700;
	}

	.text {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 500;
	}

	img {
		max-height: 7rem;
		object-fit: contain;
	}
</style>
