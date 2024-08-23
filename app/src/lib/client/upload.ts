export async function uploadAsFormData(file: File): Promise<string> {
	const data = new FormData();
	data.set('upload', file);

	const uploadResponse = await fetch('/upload', {
		method: 'POST',
		body: data,
		credentials: 'include'
	});

	if (uploadResponse.ok) {
		return uploadResponse.headers.get('Location') as string;
	} else {
		throw new Error('upload failed');
	}
}
