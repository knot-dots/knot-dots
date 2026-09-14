import { resource } from 'runed';
import { fromStore } from 'svelte/store';
import { page } from '$app/state';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { createFeatureDecisions } from '$lib/features';
import { type PayloadType, templatablePayloadTypes } from '$lib/models';
import { isProgramScopedTemplateRoot } from '$lib/programTemplates';
import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';

interface Options {
	candidateTypes: () => readonly PayloadType[];
	organizationGuid: () => string;
	programGuid: () => string;
}

const templatableTypes = new Set<string>(templatablePayloadTypes);

export default function createProgramTemplateAvailability({
	candidateTypes,
	organizationGuid,
	programGuid
}: Options) {
	const created = fromStore(lastCreatedContainers);
	const deleted = fromStore(lastDeletedContainers);
	const updated = fromStore(lastUpdatedContainers);
	const enabled = $derived(
		createFeatureDecisions(page.data.features).useProgramTemplateWorkspaces()
	);

	const candidateKey = $derived(
		[...new Set(candidateTypes().filter((type) => templatableTypes.has(type)))]
			.sort()
			.join('\u0000')
	);

	const availabilityResource = resource(
		[() => enabled, () => candidateKey, organizationGuid, programGuid],
		async ([isEnabled, typesKey, organization, program], _, { signal }) => {
			if (!isEnabled) {
				return [];
			}
			const types = typesKey ? (typesKey.split('\u0000') as PayloadType[]) : [];
			const matches = await Promise.all(
				types.map(async (payloadType) => {
					const query = new URLSearchParams({
						availableIn: program,
						organization,
						payloadType,
						template: 'true',
						templateRoot: 'true'
					});
					const result = await fetchContainerPage({
						fetch,
						// This request only answers whether the create option should be shown.
						// The dialog loads the complete template set for the selected type.
						limit: 1,
						offset: 0,
						query,
						signal
					});
					return result.containers.length > 0 ? payloadType : undefined;
				})
			);
			return matches.filter((type) => type !== undefined);
		}
	);

	const availableTypes = $derived.by(() => {
		const available = new Set<PayloadType>(availabilityResource.current ?? []);
		const organization = organizationGuid();
		const program = programGuid();
		for (const container of [...created.current.values(), ...updated.current.values()]) {
			if (
				!deleted.current.has(container.guid) &&
				isProgramScopedTemplateRoot(container, {
					organizationGuid: organization,
					programGuid: program
				})
			) {
				available.add(container.payload.type);
			}
		}
		return available;
	});

	return {
		has(payloadType: PayloadType) {
			return !enabled || availableTypes.has(payloadType);
		},
		get error() {
			return availabilityResource.error;
		},
		get loading() {
			return availabilityResource.loading;
		}
	};
}
