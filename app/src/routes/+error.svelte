<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowLongRight from '~icons/heroicons/arrow-long-right';
	import { page } from '$app/state';
	import Layout from '$lib/components/Layout.svelte';

	const title = $derived.by(() => {
		let title = page.data?.currentOrganization?.payload?.name ?? $_('page_title');

		// Add organizational unit if present
		if (page.data?.currentOrganizationalUnit) {
			title += ' > ' + page.data.currentOrganizationalUnit.payload.name;
		}

		// Add status code
		title += ' / ' + page.status;
		return title;
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<Layout>
	{#snippet main()}
		<div>
			<h2>{page.status}</h2>
			<p>{page.status === 404 ? $_('error.not_found') : page.error?.message}</p>
			<p><a href="/"><ArrowLongRight />{$_('home')}</a></p>
		</div>
	{/snippet}
</Layout>

<style>
	div {
		padding: 4rem 1.5rem;
		text-align: center;
		width: 100%;
	}
	h2 {
		color: var(--color-primary-700);
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
