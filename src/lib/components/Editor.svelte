<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import {
		Editor,
		commandsCtx,
		defaultValueCtx,
		editorViewOptionsCtx,
		rootCtx
	} from '@milkdown/core';
	import { history, redoCommand, undoCommand } from '@milkdown/plugin-history';
	import { listener, listenerCtx } from '@milkdown/plugin-listener';
	import { upload, uploadConfig } from '@milkdown/plugin-upload';
	import type { Uploader } from '@milkdown/plugin-upload';
	import {
		commonmark,
		listItemSchema,
		toggleEmphasisCommand,
		toggleStrongCommand,
		wrapInBulletListCommand
	} from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { Node } from '@milkdown/prose/model';
	import { $view as view } from '@milkdown/utils';
	import { useNodeViewFactory, useProsemirrorAdapterProvider } from '@prosemirror-adapter/svelte';
	import type { SvelteNodeViewComponent } from '@prosemirror-adapter/svelte';
	import { _ } from 'svelte-i18n';
	import ArrowUturnLeft from '~icons/heroicons/arrow-uturn-left-20-solid';
	import ArrowUturnRight from '~icons/heroicons/arrow-uturn-right-20-solid';
	import ListBullet from '~icons/heroicons/list-bullet-20-solid';
	import { uploadAsFormData } from '$lib/client/upload';
	import ListItem from '$lib/components/ListItem.svelte';

	export let value = '';
	export let label = '';

	const labelId = `label-${counter + 1}`;

	useProsemirrorAdapterProvider();
	const nodeViewFactory = useNodeViewFactory();

	const uploader: Uploader = async (files, schema) => {
		const images: File[] = [];

		for (let i = 0; i < files.length; i++) {
			const file = files.item(i);
			if (!file) {
				continue;
			}

			if (!file.type.includes('image')) {
				continue;
			}

			images.push(file);
		}

		const nodes: Array<Node | undefined> = await Promise.all(
			images.map(async (image) => {
				try {
					const src = await uploadAsFormData(image);
					const alt = image.name;
					return schema.nodes.image.createAndFill({
						src,
						alt
					}) as Node;
				} catch (e) {
					console.log(e);
					return;
				}
			})
		);

		return nodes.filter((n): n is Node => n instanceof Node);
	};

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

	function toggleEmphasis() {
		editor.action((ctx) => {
			ctx.get(commandsCtx).call(toggleEmphasisCommand.key);
		});
	}

	function toggleStrong() {
		editor.action((ctx) => {
			ctx.get(commandsCtx).call(toggleStrongCommand.key);
		});
	}

	function wrapInBulletList() {
		editor.action((ctx) => {
			ctx.get(commandsCtx).call(wrapInBulletListCommand.key);
		});
	}

	function undo() {
		editor.action((ctx) => {
			ctx.get(commandsCtx).call(undoCommand.key);
		});
	}

	function redo() {
		editor.action((ctx) => {
			ctx.get(commandsCtx).call(redoCommand.key);
		});
	}
</script>

<div>
	<p id={labelId}>{label}</p>
	<div class="focus-indicator" use:makeEditor>
		<ul class="toolbar">
			<li>
				<button type="button" on:click={undo} on:mousedown|preventDefault>
					<strong><ArrowUturnLeft /></strong>
				</button>
			</li>
			<li>
				<button type="button" on:click={redo} on:mousedown|preventDefault>
					<strong><ArrowUturnRight /></strong>
				</button>
			</li>
			<li>
				<button type="button" on:click={toggleStrong} on:mousedown|preventDefault>
					<strong>{$_('editor.strong')}</strong>
				</button>
			</li>
			<li>
				<button type="button" on:click={toggleEmphasis} on:mousedown|preventDefault>
					<em>{$_('editor.emphasis')}</em>
				</button>
			</li>
			<li>
				<button type="button" on:click={wrapInBulletList} on:mousedown|preventDefault>
					<ListBullet />
				</button>
			</li>
		</ul>
	</div>
</div>

<style>
	.focus-indicator {
		border: solid 1px var(--color-gray-300);
		border-radius: 8px;
	}

	.toolbar {
		display: flex;
		border-bottom: solid 1px var(--color-gray-300);
	}

	.toolbar li {
		display: flex;
	}

	.toolbar button {
		align-items: center;
		border: none;
		display: flex;
		justify-content: center;
		padding: 0.5rem;
		width: 2.5rem;
	}

	:global(.milkdown) {
		padding: 0.75rem 1rem;
	}

	:global([contenteditable]) {
		white-space: pre-wrap;
		min-height: 6.25rem;
	}

	:global([contenteditable]:focus) {
		outline: none;
	}
</style>
