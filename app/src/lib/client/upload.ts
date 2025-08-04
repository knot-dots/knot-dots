import { z } from 'zod';

export async function uploadAsFormData(file: File): Promise<string> {
	const data = new FormData();
	data.set('upload', file);

	const uploadResponse = await fetch('/upload', {
		method: 'POST',
		body: data,
		credentials: 'include'
	});

	if (!uploadResponse.ok) {
		throw new Error('upload failed');
	}

	const parseResult = z.object({ url: z.string().url() }).safeParse(await uploadResponse.json());

	if (!parseResult.success) {
		throw new Error('upload failed');
	}

	return parseResult.data.url;
}
