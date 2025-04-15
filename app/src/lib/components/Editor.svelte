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
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import { placeholderConfig, placeholderPlugin } from '$lib/milkdown/placeholder';
	import { toolbar, toolbarPluginView } from '$lib/milkdown/toolbar';
	import uploader from '$lib/milkdown/uploader';

	export let value = '';
	export let label = '';
	export let autosave = false;

	const labelId = `label-${counter + 1}`;

	let editor: Editor;
	let timer: ReturnType<typeof setTimeout>;

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
					if (autosave) {
						clearTimeout(timer);
						timer = setTimeout(async () => {
							node.closest('form')?.requestSubmit();
						}, 2000);
					}
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

<div
	class={createFeatureDecisions(page.data.features).useEditableDetailView()
		? 'details-tab'
		: undefined}
	use:makeEditor
>
	{#if label}
		<h3 id={labelId}>{label}</h3>
	{/if}
</div>

<style>
	h3 {
		color: inherit;
		margin-bottom: 0;
	}

	:global(.milkdown) {
		background-color: var(--form-control-background);
		border: solid 1px var(--color-gray-300);
		border-radius: 8px;
		padding: 0.75rem 1rem;
	}

	:global([contenteditable]) {
		min-height: 6.25rem;
		padding: 0;
		white-space: pre-wrap;
	}

	:global([contenteditable]:focus) {
		outline: none;
	}

	:global([contenteditable] .placeholder::before) {
		content: attr(data-placeholder);
	}

	@container style(--editor-style: new) {
		h3 {
			color: var(--color-gray-700);
			margin-bottom: 0.5rem;
		}

		:global(.milkdown) {
			background-color: transparent;
			border: none;
			padding: 0;
		}

		:global([contenteditable]) {
			min-height: revert;
		}
	}
</style>
