<script lang="ts">
	import { Icon, Pencil } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import { user } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: relatedContainers = data.relatedContainers;
</script>

<ContainerDetailView {container} {relatedContainers}>
	<svelte:fragment slot="header">
		<h2>{container.payload.title}</h2>
		{#if $user.isAuthenticated}
			<div class="icons">
				<a href="{container.guid}/edit" class="icons-element">
					<Icon solid src={Pencil} size="20" />
				</a>
			</div>
		{/if}
	</svelte:fragment>
</ContainerDetailView>
