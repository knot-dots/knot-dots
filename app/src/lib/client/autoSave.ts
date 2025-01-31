import { invalidateAll } from '$app/navigation';
import saveContainer from '$lib/client/saveContainer';
import type { AnyContainer } from '$lib/models';

export default function autoSave(container: AnyContainer) {
	return async () => {
		const response = await saveContainer(container);
		if (response.ok) {
			await invalidateAll();
		} else {
			const error = await response.json();
			alert(error.message);
		}
	};
}
