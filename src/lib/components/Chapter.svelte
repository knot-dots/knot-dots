<script lang="ts">
	import { Viewer } from 'bytemd';
	import { _ } from 'svelte-i18n';
	import type { Container } from '$lib/models';

	export let container: Container;
</script>

<div class="chapter">
	<h3>{container.payload.title}</h3>
	{#if 'description' in container.payload}
		<Viewer value={container.payload.description} />
	{/if}
	<footer>
		<a class="button" href="/{container.payload.type}/{container.guid}">{$_('read_more')}</a>
	</footer>
</div>

<style>
	h3 {
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
