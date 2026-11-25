import { createContext } from 'svelte';
import { pushState } from '$app/navigation';
import type {
	CreatedObjectiveOrEffect,
	ObjectiveOrEffectType
} from '$lib/objectiveOrEffectCreation';
import type { Container, GoalPayload, IooiType, MeasurePayload } from '$lib/models';

export interface CreateObjectiveOrEffectDialogRequest {
	iooiType?: IooiType;
	onCreated?: (created: CreatedObjectiveOrEffect) => void;
	target: Container<GoalPayload | MeasurePayload>;
	type: ObjectiveOrEffectType;
}

export interface CreateObjectiveOrEffectDialogContext {
	readonly request: CreateObjectiveOrEffectDialogRequest | undefined;
	open(request: CreateObjectiveOrEffectDialogRequest): void;
	close(): void;
}

// Holds what the dialog for creating an objective or effect was opened for,
// while it is open. Must be created during component initialization.
export function createCreateObjectiveOrEffectDialogContext(): CreateObjectiveOrEffectDialogContext {
	let request = $state.raw<CreateObjectiveOrEffectDialogRequest>();

	return {
		get request() {
			return request;
		},
		open(value) {
			request = value;
			// Each step of the dialog is an entry in the history, so that the
			// browser's back button returns to the previous step.
			pushState('', { createObjectiveOrEffect: { step: 1 } });
		},
		close() {
			request = undefined;
		}
	};
}

export const [
	getCreateObjectiveOrEffectDialogContext,
	setCreateObjectiveOrEffectDialogContext,
	hasCreateObjectiveOrEffectDialogContext
] = createContext<CreateObjectiveOrEffectDialogContext>();
