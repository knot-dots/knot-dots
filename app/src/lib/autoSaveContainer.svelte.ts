import debounce from 'p-debounce';
import { watch } from 'runed';
import { invalidate } from '$app/navigation';
import saveContainer from '$lib/client/saveContainer';
import { type AnyContainer } from '$lib/models';

const debouncedSaveContainer = debounce.promise(
	(container: AnyContainer, invalidateResource: string) =>
		saveContainer(container)
			.then((response) =>
				response.ok ? response.json() : response.json().then((error) => Promise.reject(error))
			)
			.then((updatedContainer) => {
				container.revision = updatedContainer.revision;
			})
			.then(() => invalidate(invalidateResource)),
	{ after: true }
);

export function autoSaveContainer<T extends AnyContainer>(
	container: T,
	delay: number,
	invalidateResource: string = 'containers'
): T {
	let timer: ReturnType<typeof setTimeout>;

	const autoSaveContainer = $state(container);

	watch(
		[
			() => autoSaveContainer.organization,
			() => autoSaveContainer.organizational_unit,
			() => $state.snapshot(autoSaveContainer.payload)
		],
		() => {
			clearTimeout(timer);
			timer = setTimeout(
				() =>
					debouncedSaveContainer(autoSaveContainer, invalidateResource).catch((e) =>
						alert(e.message)
					),
				delay
			);
		},
		{ lazy: true }
	);

	return autoSaveContainer;
}
