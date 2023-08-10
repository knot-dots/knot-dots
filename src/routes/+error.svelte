<script lang="ts">
	import { ArrowLongRight, Icon } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
</script>

<div>
	<h2>{$page.status}</h2>
	<p>{$page.status === 404 ? $_('error.not_found') : $page.error?.message}</p>
	<p><a href="/"><Icon src={ArrowLongRight} size="24" />{$_('home')}</a></p>
</div>

<style>
	div {
		padding: 4rem 1.5rem;
		text-align: center;
		width: 100%;
	}
	h2 {
		color: var(--color-primary);
		font-size: 8rem;
		font-weight: 800;
		line-height: 1;
	}
	p {
		font-size: 2.25rem;
		line-height: 2.5rem;
		margin: 1rem;
	}
	a {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
	}
</style>
