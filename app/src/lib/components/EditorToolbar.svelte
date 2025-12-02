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
	import tooltip from '$lib/attachments/tooltip';
	
	interface Props {
		ctx: Ctx;
		show: boolean;
	}

	const { ctx, show = false }: Props = $props();

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
			aria-label={$_('editor.strong')}
			{@attach tooltip($_('editor.strong'))}
		>
			<strong>{$_('editor.strong')}</strong>
		</button>
	</li>
	<li>
		<button
			type="button"
			onmousedown={onClick((ctx) => ctx.get(commandsCtx).call(toggleEmphasisCommand.key))}
			aria-label={$_('editor.emphasis')}
			{@attach tooltip($_('editor.emphasis'))}
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
		background-color: white;
		border: solid 1px var(--color-gray-200);
		border-radius: 12px;
		box-shadow: var(--shadow-md);
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem;
	}

	.toolbar li {
		display: flex;
		padding: 0;
	}

	.toolbar button {
		--button-active-background: var(--color-gray-200);
		--button-hover-background: var(--color-gray-100);
		--padding-x: 0;
		--padding-y: 0;

		align-items: center;
		border: none;
		border-radius: 4px;
		display: flex;
		font-size: 1rem;
		justify-content: center;
		width: 1.5rem;
	}

	.toolbar button:hover {
		cursor: pointer;
	}
</style>
