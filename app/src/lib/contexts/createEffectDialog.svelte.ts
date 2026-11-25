import { createContext } from 'svelte';
import { pushState } from '$app/navigation';
import type { CreatedEffect } from '$lib/effectCreation';
import type { Container, GoalPayload, IooiType, MeasurePayload } from '$lib/models';

export interface CreateEffectDialogRequest {
	iooiType?: IooiType;
	onCreated?: (created: CreatedEffect) => void;
	target: Container<GoalPayload | MeasurePayload>;
}

export interface CreateEffectDialogContext {
	readonly request: CreateEffectDialogRequest | undefined;
	open(request: CreateEffectDialogRequest): void;
	close(): void;
}

// Holds what the dialog for creating an effect was opened for, while it is
// open. Must be created during component initialization.
export function createCreateEffectDialogContext(): CreateEffectDialogContext {
	let request = $state.raw<CreateEffectDialogRequest>();

	return {
		get request() {
			return request;
		},
		open(value) {
			request = value;
			// Each step of the dialog is an entry in the history, so that the
			// browser's back button returns to the previous step.
			pushState('', { createEffect: { step: 1 } });
		},
		close() {
			request = undefined;
		}
	};
}

export const [
	getCreateEffectDialogContext,
	setCreateEffectDialogContext,
	hasCreateEffectDialogContext
] = createContext<CreateEffectDialogContext>();
