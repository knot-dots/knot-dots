<script lang="ts">
	import { browser } from '$app/environment';
	import Overlay from '$lib/components/Overlay.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import { overlay, user } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="profile">
	<div class="detail-page-content profile-inner">
		<header class="content-header">
			<h2 class="with-icons">
				{$user.givenName}
				{$user.familyName}
			</h2>
		</header>
		<div class="content-details masked-overflow">
			<ProfileView
				containers={data.containers}
				organizations={data.organizations}
				organizationalUnits={data.organizationalUnits}
			/>
		</div>
	</div>
</div>

{#if browser && $overlay.revisions.length > 0}
	<Overlay {...$overlay} />
{/if}

<style>
	.profile {
		flex: 1 1;
		overflow-x: auto;
	}

	.profile-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}
</style>
