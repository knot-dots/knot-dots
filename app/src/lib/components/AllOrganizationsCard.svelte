<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo1 from '$lib/assets/logo-1.svg';
	import logo2 from '$lib/assets/logo-2.svg';
	import logo3 from '$lib/assets/logo-3.svg';
	import Card from '$lib/components/Card.svelte';
	import { type OrganizationContainer } from '$lib/models';

	interface Props {
		linkPath: string;
	}

	let { linkPath }: Props = $props();

	const logos = [logo1, logo2, logo3];
	const logo = logos[Math.floor(page.data.random * logos.length)];

	let defaultOrganization = $derived(
		page.data.organizations.find(
			({ payload }: OrganizationContainer) => payload.default
		) as OrganizationContainer
	);

	function href() {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		url.pathname = linkPath;
		return url.toString();
	}
</script>

<Card container={defaultOrganization} {href}>
	{#snippet body()}
		<p>{$_('show_all_organizations')}</p>
		<img alt={$_('image')} src={logo} />
	{/snippet}
</Card>

<style>
	img {
		max-height: 7rem;
		object-fit: contain;
	}
</style>
