import type { Plugin } from 'unified';
import type { Root } from 'hast';
import { findAndReplace } from 'hast-util-find-and-replace';

export interface RehypeReplaceOptions {
	context: App.PageData;
}

const rehypeReplace: Plugin<[RehypeReplaceOptions], Root> = ({ context }) => {
	return (tree: Root) => {
		findAndReplace(tree, [
			/@current_organizational_unit_name/,
			context.currentOrganizationalUnit?.payload.name ?? ''
		]);
	};
};

export default rehypeReplace;
