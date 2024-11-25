import { invalidateAll } from '$app/navigation';
import saveContainer from '$lib/client/saveContainer';
import type { AnyContainer } from '$lib/models';

let timer: ReturnType<typeof setTimeout>;

export default function debouncedSave(container: AnyContainer) {
	return () => {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			const response = await saveContainer(container);
			if (response.ok) {
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}, 1000);
	};
}
