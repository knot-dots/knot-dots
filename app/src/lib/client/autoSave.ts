import saveContainer from '$lib/client/saveContainer';
import type { AnyContainer } from '$lib/models';

export default function autoSave(container: AnyContainer, delay: number) {
	let timer: ReturnType<typeof setTimeout>;

	return (event: SubmitEvent) => {
		event.preventDefault();
		clearTimeout(timer);
		timer = setTimeout(async () => {
			const response = await saveContainer(container);
			if (response.ok) {
				const updatedContainer = await response.json();
				container.revision = updatedContainer.revision;
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}, delay);
	};
}
