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
	import { listener, listenerCtx } from '@milkdown/plugin-listener';
	import {
		commonmark,
		toggleEmphasisCommand,
		toggleStrongCommand,
		wrapInBulletListCommand
	} from '@milkdown/preset-commonmark';
	import { Icon, ListBullet } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';

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
				ctx.update(editorViewOptionsCtx, (prev) => ({
					...prev,
					attributes: { 'aria-labelledby': labelId }
				}));
			})
			.use(commonmark)
			.use(listener)
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
</script>

<div use:makeEditor>
	<p id={labelId}>{label}</p>
	<ul class="toolbar">
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
