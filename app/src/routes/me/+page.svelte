<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];
</script>

<Layout>
	<Header sortOptions={[]} {workspaceOptions} slot="header" />

	<div slot="main">
		<ProfileView containers={data.containers} />
		<Help slug="profile" />
	</div>
</Layout>

<style>
	div {
		height: 100%;
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
		overflow: auto;
	}
</style>
