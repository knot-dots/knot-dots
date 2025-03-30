<script lang="ts">
	import { commandsCtx } from '@milkdown/core';
	import type { Ctx } from '@milkdown/kit/ctx';
	import {
		toggleEmphasisCommand,
		toggleStrongCommand,
		wrapInBulletListCommand
	} from '@milkdown/preset-commonmark';
	import { _ } from 'svelte-i18n';
	import ListBullet from '~icons/heroicons/list-bullet-20-solid';

	interface Props {
		ctx: Ctx;
		show: boolean;
	}

	const { ctx, show = false } = $props();

	const onClick = (fn: (ctx: Ctx) => void) => (e: MouseEvent) => {
		e.preventDefault();
		ctx && fn(ctx);
	};
</script>

<ul class="toolbar">
	<li>
		<button
			type="button"
			onmousedown={onClick((ctx) => ctx.get(commandsCtx).call(toggleStrongCommand.key))}
		>
			<strong>{$_('editor.strong')}</strong>
		</button>
	</li>
	<li>
		<button
			type="button"
			onmousedown={onClick((ctx) => ctx.get(commandsCtx).call(toggleEmphasisCommand.key))}
		>
			<em>{$_('editor.emphasis')}</em>
		</button>
	</li>
	<li>
		<button
			type="button"
			onmousedown={onClick((ctx) => ctx.get(commandsCtx).call(wrapInBulletListCommand.key))}
		>
			<ListBullet />
		</button>
	</li>
</ul>

<style>
	.toolbar {
		background-color: var(--form-control-background);
		border: solid 1px var(--color-gray-300);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
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

	.toolbar button:hover {
		cursor: pointer;
	}
</style>
