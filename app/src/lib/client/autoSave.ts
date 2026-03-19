import { invalidate } from '$app/navigation';
import saveContainer from '$lib/client/saveContainer';
import type { AnyContainer } from '$lib/models';

export default function autoSave(
	container: AnyContainer,
	delay: number,
	invalidateResource: string = 'containers'
) {
	let timer: ReturnType<typeof setTimeout>;
	let inFlight = false;
	let pendingSave = false;

	async function doSave() {
		inFlight = true;
		pendingSave = false; // consume the pending flag before awaiting
		try {
			const response = await saveContainer(container);
			if (response.ok) {
				const updatedContainer = await response.json();
				container.revision = updatedContainer.revision;
				await invalidate(invalidateResource);
			} else {
				const error = await response.json();
				alert(error.message);
			}
		} finally {
			inFlight = false;
			if (pendingSave) {
				doSave(); // one follow-up save, using latest container state
			}
		}
	}

	return (event: SubmitEvent) => {
		event.preventDefault();
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (inFlight) {
				pendingSave = true; // overwrite any previously scheduled follow-up
			} else {
				doSave();
			}
		}, delay);
	};
}
