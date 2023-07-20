export async function uploadAsFormData(file: File, token: string): Promise<string> {
	const data = new FormData();
	data.set('upload', file);

	const uploadResponse = await fetch('/upload', {
		method: 'POST',
		body: data,
		headers: { Authorization: `Bearer ${token}` }
	});

	if (uploadResponse.ok) {
		return uploadResponse.headers.get('Location') as string;
	} else {
		throw new Error('upload failed');
	}
}
