<script lang="ts">
	import { Crepe } from '@milkdown/crepe';
	import '@milkdown/crepe/theme/common/style.css';
	import '@milkdown/crepe/theme/frame.css';
	import { rootAttrsCtx } from '@milkdown/kit/core';
	import { listener, listenerCtx } from '@milkdown/plugin-listener';

	export let value = '';

	function editor(node: HTMLElement) {
		const crepe = new Crepe({
			defaultValue: value,
			features: {
				[Crepe.Feature.BlockEdit]: true,
				[Crepe.Feature.Cursor]: true,
				[Crepe.Feature.CodeMirror]: false,
				[Crepe.Feature.ImageBlock]: true,
				[Crepe.Feature.LinkTooltip]: true,
				[Crepe.Feature.Table]: true
			},
			root: node
		});

		crepe.editor.config((ctx) => {
			ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
				value = markdown;
				node.closest('form')?.requestSubmit();
			});
			ctx.update(rootAttrsCtx, (prev) => ({
				...prev,
				class: 'milkdown focus-indicator'
			}));
		});
		crepe.editor.use(listener);
		crepe.create().then();

		return {
			destroy() {
				crepe.destroy();
			}
		};
	}
</script>

<div use:editor>
	<slot />
</div>

<style>
	div :global(.milkdown) {
		--crepe-color-background: var(--color-gray-050);
		--crepe-color-on-background: var(--color-gray-500);
		--crepe-color-outline: var(--crepe-color-on-background);
		border-radius: 8px;
		padding: 0.75rem 1rem;
	}

	div :global(.milkdown .editor) {
		color: inherit;
		padding: 0;
	}

	div :global(.editor p) {
		font-size: inherit;
		line-height: inherit;
		padding: 0;
	}

	div :global(.editor .list-item p) {
		padding: 4px 0;
	}
</style>
