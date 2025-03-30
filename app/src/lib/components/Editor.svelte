<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/core';
	import { history } from '@milkdown/plugin-history';
	import { listener, listenerCtx } from '@milkdown/plugin-listener';
	import { upload, uploadConfig } from '@milkdown/plugin-upload';
	import { commonmark, listItemSchema } from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { $view as view } from '@milkdown/utils';
	import { useNodeViewFactory, useProsemirrorAdapterProvider } from '@prosemirror-adapter/svelte';
	import type { SvelteNodeViewComponent } from '@prosemirror-adapter/svelte';
	import ListItem from '$lib/components/ListItem.svelte';
	import { toolbar, toolbarPluginView } from '$lib/milkdown/toolbar';
	import uploader from '$lib/milkdown/uploader';

	export let value = '';
	export let label = '';

	const labelId = `label-${counter + 1}`;

	useProsemirrorAdapterProvider();
	const nodeViewFactory = useNodeViewFactory();

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
				ctx.set(toolbar.key, {
					view: toolbarPluginView(ctx)
				});
			})
			.use(commonmark)
			.use(gfm)
			.use(history)
			.use(listener)
			.use(upload)
			.use(
				view(listItemSchema.node, () =>
					nodeViewFactory({
						component: ListItem as SvelteNodeViewComponent,
						as: 'li'
					})
				)
			)
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

<div>
	{#if label}
		<h3 id={labelId}>{label}</h3>
	{/if}
	<div use:makeEditor></div>
</div>

<style>
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

	@container style(--editor-style: new) {
		:global(.milkdown) {
			border: none;
		}

		:global([contenteditable]) {
			min-height: revert;
		}
	}
</style>
