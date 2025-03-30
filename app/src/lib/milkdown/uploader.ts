import type { Uploader } from '@milkdown/plugin-upload';
import { Node } from '@milkdown/prose/model';
import { uploadAsFormData } from '$lib/client/upload';

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

export default uploader;
