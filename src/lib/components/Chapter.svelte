<script lang="ts">
	import { Viewer } from 'bytemd';
	import { Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import type { Container } from '$lib/models';
	import { user } from '$lib/stores';

	export let container: Container;
</script>

<div class="chapter">
	<h3>
		{container.payload.title}
		{#if $user.isAuthenticated}
			<a href="?edit={container.guid}" class="icons-element">
				<Icon solid src={Pencil} size="20" />
			</a>
		{/if}
	</h3>
	{#if 'description' in container.payload}
		<Viewer value={container.payload.description} />
	{/if}
	<footer>
		<a class="button" href="/{container.payload.type}/{container.guid}">{$_('read_more')}</a>
	</footer>
</div>

<style>
	h3 {
		display: flex;
		justify-content: space-between;
		font-weight: 500;
	}

	div {
		padding: 1.5rem;
	}

	.chapter footer {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		padding: 0;
	}
</style>
