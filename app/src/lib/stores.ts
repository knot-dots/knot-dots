import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import defineAbilityFor from '$lib/authorization';
import type { Favorite } from '$lib/contexts/favoriteList';
import {
	type AnyPayload,
	type ApplicationState,
	type Container,
	type CustomCollectionPayload,
	containerOfType,
	emptyGrantRecords,
	type GoalPayload,
	type GrantRecords,
	type IooiType,
	type MeasurePayload,
	type OrganizationalUnitPayload,
	type PayloadType,
	type RelationCollectionPayload
} from '$lib/models';

export const applicationState = writable<ApplicationState>({
	containerDetailView: {
		editable: false
	}
});

export const compareState = writable<{
	selectedMunicipalities: Container<OrganizationalUnitPayload>[];
	colorAssignments: Record<string, string>;
}>({
	selectedMunicipalities: [],
	colorAssignments: {}
});

export type User = {
	familyName: string;
	givenName: string;
	grants: GrantRecords;
	guid: string;
	isAuthenticated: boolean;
	roles: string[];
	settings: {
		favorite?: Favorite[];
		features?: string[];
	};
};

export const user = derived(
	page,
	(values): User => {
		if (values.data.session?.user) {
			return {
				...values.data.session?.user,
				isAuthenticated: true
			};
		} else {
			return {
				familyName: '',
				givenName: '',
				grants: emptyGrantRecords(),
				guid: '',
				isAuthenticated: false,
				roles: [],
				settings: {}
			};
		}
	},
	{
		familyName: '',
		givenName: '',
		grants: emptyGrantRecords(),
		guid: '',
		isAuthenticated: false,
		roles: [],
		settings: {}
	}
);

export const ability = derived(user, defineAbilityFor);

export const dragged = writable<Container<AnyPayload> | undefined>();

export const mayCreateContainer = derived(ability, (values) => {
	return (payloadType: PayloadType, parent: Container<AnyPayload>): boolean => {
		// creating happens within the parent; the stub inherits its computed grants
		return values.can('create', containerOfType(payloadType, parent));
	};
});

export const mayDeleteContainer = derived(ability, (values) => {
	return (container: Container<AnyPayload>): boolean => {
		return values.can('delete', container);
	};
});

const storedOverlayWidth = browser ? sessionStorage.getItem('overlayWidth') : null;

export const overlayWidth = writable<number>(
	storedOverlayWidth ? parseFloat(storedOverlayWidth) : 0.65
);

if (browser) {
	overlayWidth.subscribe((value) => sessionStorage.setItem('overlayWidth', value.toString()));
}

type AddEffectState = {
	target?: Container<GoalPayload | MeasurePayload>;
	iooiType?: IooiType;
};

export const addEffectState = writable<AddEffectState>({});

type AddObjectiveState = {
	target?: Container<GoalPayload>;
	iooiType?: IooiType;
};

export const addObjectiveState = writable<AddObjectiveState>({});

type AddItemState = {
	target?: Container<CustomCollectionPayload | RelationCollectionPayload>;
};

export const addItemState = writable<AddItemState>({});

export {
	createContainerDialogState,
	newContainer,
	openContainerCopyDialog,
	type CreateContainerDialogState
} from '$lib/createContainerDialogState.svelte';

export const lastCreatedContainers = writable<Map<string, Container<AnyPayload>>>(new Map());

export const lastUpdatedContainers = writable<Map<string, Container<AnyPayload>>>(new Map());

export const lastDeletedContainers = writable<Map<string, Container<AnyPayload>>>(new Map());
