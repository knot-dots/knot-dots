<script lang="ts">
	import { _ } from 'svelte-i18n';
	import transformFileURL from '$lib/transformFileURL';
	import type { AnyContainer } from '$lib/models';

	interface Props {
		editable?: boolean;
		container: AnyContainer & { payload: { cover?: string; coverSource?: string } };
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

{#if container.payload.cover}
	<div class="cover-section">
		<img alt={$_('cover')} class="cover" src={transformFileURL(container.payload.cover)} />
		{#if editable}
			<label class="cover-source">
				{$_('image_source')}:
				<input bind:value={container.payload.coverSource} name="coverSource" type="text" />
			</label>
		{:else if container.payload.coverSource}
			<span class="cover-source">
				{$_('image_source')}: {container.payload.coverSource}
			</span>
		{/if}
	</div>
{/if}

<style>
	.cover-section {
		position: relative;
	}

	.cover-source {
		background-color: rgba(255, 255, 255, 0.85);
		bottom: 0;
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 400;
		padding: 0.125rem 0.25rem;
		position: absolute;
		right: 0;
	}

	input {
		border: none;
		border-radius: 4px;
		display: inline;
		color: inherit;
		field-sizing: content;
		font-size: inherit;
		font-weight: inherit;
		padding: 0.125rem 0.25rem;
		min-width: 4rem;
		width: fit-content;
	}
</style>
