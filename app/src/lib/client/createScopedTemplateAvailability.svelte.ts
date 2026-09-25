import { resource } from 'runed';
import { fromStore } from 'svelte/store';
import { page } from '$app/state';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { createFeatureDecisions } from '$lib/features';
import { type PayloadType, templatablePayloadTypes } from '$lib/models';
import { isScopedTemplateRoot } from '$lib/templateScopes';
import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';

interface Options {
	active?: () => boolean | undefined;
	candidateTypes: () => readonly PayloadType[];
	organizationGuid: () => string;
	scopeGuid: () => string | undefined;
}

const templatableTypes = new Set<string>(templatablePayloadTypes);

export default function createScopedTemplateAvailability({
	active = () => true,
	candidateTypes,
	organizationGuid,
	scopeGuid
}: Options) {
	const created = fromStore(lastCreatedContainers);
	const deleted = fromStore(lastDeletedContainers);
	const updated = fromStore(lastUpdatedContainers);
	const enabled = $derived(createFeatureDecisions(page.data.features).useTemplateWorkspaces());
	const isActive = $derived(enabled && !!active());
	const organization = $derived(organizationGuid());
	const scope = $derived(scopeGuid());

	const candidateKey = $derived(
		[...new Set(candidateTypes().filter((type) => templatableTypes.has(type)))]
			.sort()
			.join('\u0000')
	);

	const availabilityResource = resource(
		[() => isActive, () => candidateKey, () => organization, () => scope],
		async ([isEnabled, typesKey, organization, scope], _, { signal }) => {
			if (!isEnabled || !scope) {
				return { scopeGuid: scope, organization, types: [] as PayloadType[] };
			}
			const types = typesKey ? (typesKey.split('\u0000') as PayloadType[]) : [];
			const matches = await Promise.all(
				types.map(async (payloadType) => {
					const query = new URLSearchParams({
						availableIn: scope,
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
				scopeGuid: scope,
				organization,
				types: matches.filter((type) => type !== undefined)
			};
		}
	);

	const availableTypes = $derived.by(() => {
		const result = availabilityResource.current;
		const available = new Set<PayloadType>(
			result?.scopeGuid === scope && result?.organization === organization ? result.types : []
		);
		for (const container of [...created.current.values(), ...updated.current.values()]) {
			if (
				scope &&
				!deleted.current.has(container.guid) &&
				isScopedTemplateRoot(container, {
					organizationGuid: organization,
					scopeGuid: scope
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
				!enabled || !scope || !templatableTypes.has(payloadType) || availableTypes.has(payloadType)
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
