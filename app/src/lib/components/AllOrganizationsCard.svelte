<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import Card from '$lib/components/Card.svelte';
	import { type OrganizationContainer } from '$lib/models';

	interface Props {
		linkPath: string;
	}

	let { linkPath }: Props = $props();

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
		height: 7rem;
		object-fit: contain;
	}
</style>
