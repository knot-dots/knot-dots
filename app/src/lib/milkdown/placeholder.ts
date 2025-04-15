import type { Node } from '@milkdown/kit/prose/model';
import type { EditorState } from '@milkdown/kit/prose/state';

import { findParent } from '@milkdown/kit/prose';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import type { Selection } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import { $ctx, $prose } from '@milkdown/kit/utils';

function isDocEmpty(doc: Node) {
	return doc.childCount <= 1 && !doc.firstChild?.content.size;
}

function isInList(selection: Selection) {
	const type = selection.$from.node(selection.$from.depth - 1)?.type;
	return type?.name === 'list_item';
}

function createPlaceholderDecoration(
	state: EditorState,
	placeholderText: string
): Decoration | null {
	const { selection } = state;
	if (!selection.empty) return null;

	const $pos = selection.$anchor;
	const node = $pos.parent;
	if (node.content.size > 0) return null;

	const inTable = findParent((node) => node.type.name === 'table')($pos);
	if (inTable) return null;

	const before = $pos.before();

	return Decoration.node(before, before + node.nodeSize, {
		class: 'placeholder',
		'data-placeholder': placeholderText
	});
}

interface PlaceholderConfig {
	text: string;
	mode: 'doc' | 'block';
}

export type PlaceHolderFeatureConfig = Partial<PlaceholderConfig>;

export const placeholderConfig = $ctx(
	{
		text: 'Please enter...',
		mode: 'block'
	} as PlaceholderConfig,
	'placeholderConfigCtx'
);

export const placeholderPlugin = $prose((ctx) => {
	return new Plugin({
		key: new PluginKey('PLACEHOLDER'),
		props: {
			decorations: (state) => {
				const config = ctx.get(placeholderConfig.key);
				if (config.mode === 'doc' && !isDocEmpty(state.doc)) {
					return null;
				}

				if (isInList(state.selection)) {
					return null;
				}

				const placeholderText = config.text ?? 'Please enter...';
				const deco = createPlaceholderDecoration(state, placeholderText);
				if (!deco) {
					return null;
				}

				return DecorationSet.create(state.doc, [deco]);
			}
		}
	});
});
