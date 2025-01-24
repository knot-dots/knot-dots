<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/stores';
	import Measures from '$lib/components/Measures.svelte';
	import ProfileSettings from '$lib/components/ProfileSettings.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		type AnyContainer,
		isAssignedTo,
		isContainerWithEffect,
		isMemberOf,
		isTaskContainer,
		overlayKey,
		paramsFromFragment
	} from '$lib/models';
	import { user } from '$lib/stores';

	export let containers: AnyContainer[];

	setContext('overlay', true);

	$: tasks = containers.filter(isTaskContainer).filter(isAssignedTo($user));
	$: measures = containers.filter(isContainerWithEffect).filter((c) => isMemberOf($user, c));
</script>

<aside>
	<Sidebar helpSlug="profile">
		<slot slot="extra" />
	</Sidebar>
</aside>

<div class="content-details masked-overflow">
	{#if paramsFromFragment($page.url).has(overlayKey.enum['my-tasks']) && tasks}
		<Tasks containers={tasks} />
	{:else if paramsFromFragment($page.url).has(overlayKey.enum['my-measures'])}
		<Measures containers={measures} />
	{:else if paramsFromFragment($page.url).has(overlayKey.enum['my-settings'])}
		<ProfileSettings />
	{:else}
		<ProfileView {containers} />
	{/if}
</div>
