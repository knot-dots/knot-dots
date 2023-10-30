<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="organization">
	<div class="detail-page-content organization-inner">
		<header class="content-header">
			<h2 class="with-icons">
				{#if 'image' in data.container.payload}
					<img alt="logo" class="logo" src={data.container.payload.image} />
				{/if}
				{data.container.payload.name}
				<span class="icons">
					{#if $ability.can('update', data.container)}
						<a href="{data.container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</span>
			</h2>
		</header>
		<div class="content-details masked-overflow">
			<OrganizationDetailView
				container={data.container}
				measures={data.measures}
				strategies={data.strategies}
			/>
		</div>
	</div>
</div>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}

<style>
	.organization {
		flex: 1 1;
		overflow-x: auto;
	}

	.organization-inner {
		min-width: calc(100vw - 24rem);
		overflow-y: auto;
	}
</style>
