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
		toggleEmphasisCommand,
		toggleStrongCommand,
		wrapInBulletListCommand
	} from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { Node } from '@milkdown/prose/model';
	import { getContext } from 'svelte';
	import { ArrowUturnLeft, ArrowUturnRight, Icon, ListBullet } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import { uploadAsFormData } from '$lib/client/upload';

	export let value = '';
	export let label = '';

	const labelId = `label-${counter + 1}`;
	const { getKeycloak } = getContext<KeycloakContext>(key);

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

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch(() => null);

		const nodes: Array<Node | undefined> = await Promise.all(
			images.map(async (image) => {
				try {
					const src = await uploadAsFormData(image, sessionStorage.getItem('token') ?? '');
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
			.create()
			.then((e) => (editor = e));

		return {
			destroy() {
				editor.destroy();
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

<div use:makeEditor>
	<p id={labelId}>{label}</p>
	<ul class="toolbar">
		<li>
			<button type="button" on:click={undo} on:mousedown|preventDefault>
				<strong><Icon src={ArrowUturnLeft} size="16" /></strong>
			</button>
		</li>
		<li>
			<button type="button" on:click={redo} on:mousedown|preventDefault>
				<strong><Icon src={ArrowUturnRight} size="16" /></strong>
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
				<Icon src={ListBullet} size="20" />
			</button>
		</li>
	</ul>
</div>

<style>
	.toolbar {
		border: solid 1px var(--color-gray-300);
		border-top-left-radius: 8px;
		border-top-right-radius: 8px;
		display: flex;
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
		border-bottom: solid 1px var(--color-gray-300);
		border-left: solid 1px var(--color-gray-300);
		border-right: solid 1px var(--color-gray-300);
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		min-height: calc(7.75rem + 1px);
		padding: 0.75rem 1rem;
	}

	:global([contenteditable]) {
		white-space: pre-wrap;
	}

	:global([contenteditable]:focus) {
		outline: none;
	}
</style>
