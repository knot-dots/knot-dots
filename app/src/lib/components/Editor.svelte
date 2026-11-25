<script module>
	let counter = 0;
</script>

<script lang="ts">
	import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/core';
	import { clipboard } from '@milkdown/plugin-clipboard';
	import { history } from '@milkdown/plugin-history';
	import { listener, listenerCtx } from '@milkdown/plugin-listener';
	import { upload, uploadConfig } from '@milkdown/plugin-upload';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { _ } from 'svelte-i18n';
	import { placeholderConfig, placeholderPlugin } from '$lib/milkdown/placeholder';
	import { toolbar, toolbarPluginView } from '$lib/milkdown/toolbar';
	import uploader from '$lib/milkdown/uploader';

	interface Props {
		value?: string;
		label?: string;
		// The id of a label shown elsewhere, which replaces the editor's own.
		labelledBy?: string;
		placeholder?: string;
	}

	let { value = $bindable(), label, labelledBy: outerLabel, placeholder }: Props = $props();

	const labelledBy = `editor-label-${counter + 1}`;

	let editor: Editor;

	function makeEditor(node: HTMLElement) {
		Editor.make()
			.config((ctx) => {
				ctx.set(rootCtx, node);
			})
			.config((ctx) => {
				ctx.set(defaultValueCtx, value ?? '');
			})
			.config((ctx) => {
				ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
					value = markdown;
					node.dispatchEvent(new InputEvent('input', { bubbles: true }));
				});
			})
			.config((ctx) => {
				ctx.update(uploadConfig.key, (prev) => ({
					...prev,
					uploader
				}));
			})
			.config((ctx) => {
				const ariaLabelledBy = outerLabel ?? (label ? labelledBy : undefined);
				if (ariaLabelledBy) {
					ctx.update(editorViewOptionsCtx, (prev) => ({
						...prev,
						attributes: { 'aria-labelledby': ariaLabelledBy }
					}));
				}
			})
			.config((ctx) => {
				ctx.update(placeholderConfig.key, (prev) => {
					return {
						...prev,
						mode: 'doc' as const,
						text: placeholder ?? $_('empty')
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
			.use(clipboard)
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

<div use:makeEditor>
	{#if label}
		<p class="label" id={labelledBy}>
			<span class="badge badge--purple">{label}</span>
		</p>
	{/if}
</div>

<style>
	.label {
		margin: 1rem 0;
	}
</style>
