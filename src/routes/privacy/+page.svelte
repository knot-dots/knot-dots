<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="detail-page-content">
	<header class="content-header">
		<h2 class="with-icons">
			{data.container.payload.title}
			<span class="icons">
				{#if $ability.can('update', data.container)}
					<a href="/page/{data.container.guid}/edit" class="icons-element">
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
		<PageDetailView container={data.container} />
	</div>
</div>
