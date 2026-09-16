import { resource } from 'runed';
import { fromStore } from 'svelte/store';
import { page } from '$app/state';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { createFeatureDecisions } from '$lib/features';
import { type PayloadType, templatablePayloadTypes } from '$lib/models';
import { isScopedTemplateRoot } from '$lib/templateScopes';
import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';

interface Options {
	candidateTypes: () => readonly PayloadType[];
	organizationGuid: () => string;
	scopeGuid: () => string | undefined;
}

const templatableTypes = new Set<string>(templatablePayloadTypes);

export default function createScopedTemplateAvailability({
	candidateTypes,
	organizationGuid,
	scopeGuid
}: Options) {
	const created = fromStore(lastCreatedContainers);
	const deleted = fromStore(lastDeletedContainers);
	const updated = fromStore(lastUpdatedContainers);
	const enabled = $derived(createFeatureDecisions(page.data.features).useTemplateWorkspaces());

	const candidateKey = $derived(
		[...new Set(candidateTypes().filter((type) => templatableTypes.has(type)))]
			.sort()
			.join('\u0000')
	);

	const availabilityResource = resource(
		[() => enabled, () => candidateKey, organizationGuid, scopeGuid],
		async ([isEnabled, typesKey, organization, program], _, { signal }) => {
			if (!isEnabled || !program) {
				return { scopeGuid: program, organization, types: [] as PayloadType[] };
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
			return {
				scopeGuid: program,
				organization,
				types: matches.filter((type) => type !== undefined)
			};
		}
	);

	const availableTypes = $derived.by(() => {
		const organization = organizationGuid();
		const program = scopeGuid();
		const result = availabilityResource.current;
		const available = new Set<PayloadType>(
			result?.scopeGuid === program && result?.organization === organization ? result.types : []
		);
		for (const container of [...created.current.values(), ...updated.current.values()]) {
			if (
				program &&
				!deleted.current.has(container.guid) &&
				isScopedTemplateRoot(container, {
					organizationGuid: organization,
					scopeGuid: program
				})
			) {
				available.add(container.payload.type);
			}
		}
		return available;
	});

	return {
		has(payloadType: PayloadType) {
			return (
				!enabled ||
				!scopeGuid() ||
				!templatableTypes.has(payloadType) ||
				availableTypes.has(payloadType)
			);
		},
		get error() {
			return availabilityResource.error;
		},
		get loading() {
			return availabilityResource.loading;
		}
	};
}
