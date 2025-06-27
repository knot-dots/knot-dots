<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/core';
	import { history } from '@milkdown/plugin-history';
	import { listener, listenerCtx } from '@milkdown/plugin-listener';
	import { upload, uploadConfig } from '@milkdown/plugin-upload';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { _ } from 'svelte-i18n';
	import { placeholderConfig, placeholderPlugin } from '$lib/milkdown/placeholder';
	import { toolbar, toolbarPluginView } from '$lib/milkdown/toolbar';
	import uploader from '$lib/milkdown/uploader';

	export let value = '';
	export let label = '';

	const labelId = `label-${counter + 1}`;

	let editor: Editor;

	function makeEditor(node: HTMLElement) {
		Editor.make()
			.config((ctx) => {
				ctx.set(rootCtx, node);
			})
			.config((ctx) => {
				ctx.set(defaultValueCtx, value);
			})
			.config((ctx) => {
				ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
					value = markdown;
				});
			})
			.config((ctx) => {
				ctx.update(uploadConfig.key, (prev) => ({
					...prev,
					uploader
				}));
			})
			.config((ctx) => {
				ctx.update(editorViewOptionsCtx, (prev) => ({
					...prev,
					attributes: { 'aria-labelledby': labelId }
				}));
			})
			.config((ctx) => {
				ctx.update(placeholderConfig.key, (prev) => {
					return {
						...prev,
						mode: 'doc' as const,
						text: $_('empty')
					};
				});
			})
			.config((ctx) => {
				ctx.set(toolbar.key, {
					view: toolbarPluginView(ctx)
				});
			})
			.use(commonmark)
			.use(gfm)
			.use(history)
			.use(listener)
			.use(placeholderConfig)
			.use(placeholderPlugin)
			.use(upload)
			.use(toolbar)
			.create()
			.then((e) => (editor = e));

		return {
			destroy() {
				if (editor) {
					editor.destroy();
				}
			}
		};
	}
</script>

<div class="details-tab" use:makeEditor>
	{#if label}
		<p class="label">
			<span class="badge badge--purple">{label}</span>
		</p>
	{/if}
</div>

<style>
	.label {
		margin-bottom: 1rem;
	}

	:global(.milkdown) {
		background-color: transparent;
		border: none;
		border-radius: 8px;
		padding: 0;
	}

	:global([contenteditable]) {
		padding: 0;
		white-space: pre-wrap;
	}

	:global([contenteditable]:focus) {
		outline: none;
	}

	:global([contenteditable] .placeholder::before) {
		content: attr(data-placeholder);
	}
</style>
