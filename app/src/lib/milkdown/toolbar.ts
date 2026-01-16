import type { Ctx } from '@milkdown/kit/ctx';
import { EditorState, TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import { tooltipFactory, TooltipProvider } from '@milkdown/plugin-tooltip';
import { type Component, mount, unmount } from 'svelte';
import EditorToolbar from '$lib/components/EditorToolbar.svelte';

export const toolbar = tooltipFactory('toolbar');

export function toolbarPluginView(ctx: Ctx) {
	return () => {
		const content = document.createElement('div');
		content.classList.add('milkdown-tooltip');
		const toolbar = mount(EditorToolbar as Component, { target: content, props: { ctx } });
		const provider = new TooltipProvider({
			content,
			debounce: 20,
			offset: 8,
			shouldShow(view: EditorView) {
				const { doc, selection } = view.state;
				const { empty, from, to } = selection;

				const isEmptyTextBlock =
					!doc.textBetween(from, to).length && selection instanceof TextSelection;

				const isNotTextBlock = !(selection instanceof TextSelection);

				const activeElement = (view.dom.getRootNode() as ShadowRoot | Document).activeElement;
				const isTooltipChildren = content.contains(activeElement);

				const notHasFocus = !view.hasFocus() && !isTooltipChildren;

				const isReadonly = !view.editable;

				if (notHasFocus || isNotTextBlock || empty || isEmptyTextBlock || isReadonly) return false;

				return true;
			}
		});

		return {
			update: (updatedView: EditorView, prevState: EditorState) => {
				provider.update(updatedView, prevState);
			},
			destroy: () => {
				provider.destroy();
				unmount(toolbar);
			}
		};
	};
}
