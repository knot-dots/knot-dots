<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Layout from '$lib/components/Layout.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
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
	<Navigation sortOptions={[]} {workspaceOptions} slot="header" />

	<div slot="main">
		<ProfileView containers={data.containers} />
	</div>
</Layout>

<style>
	div {
		height: 100%;
		overflow: auto;
	}
</style>
