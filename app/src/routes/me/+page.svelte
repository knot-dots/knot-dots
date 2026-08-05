<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];
</script>

<Layout>
	{#snippet header()}
		<Header sortOptions={[]} {workspaceOptions} />
	{/snippet}

	{#snippet main()}
		<div class="content-details">
			<ProfileView {containers} />
			<ContextTabs slug="profile" />
		</div>
	{/snippet}
</Layout>

<style>
	div {
		height: 100%;
		overflow: auto;
	}
</style>
