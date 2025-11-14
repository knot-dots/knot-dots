import fetchContainers from '$lib/client/fetchContainers';
import type { Container, PayloadType } from '$lib/models';
import { payloadTypes } from '$lib/models';

// Centralized loader for parent options used by EditableParent and others.
export function createIsPartOfOptionsRequest(
	payloadType: PayloadType,
	measureGuid?: string,
	programGuid?: string
): Promise<Container[]> {
	// Determine the target parent payload type based on context
	let targetPayloadTypes: PayloadType[] | undefined;
	if (measureGuid) {
		// Parent for a measure is a goal
		targetPayloadTypes = [payloadTypes.enum.goal];
	} else if (programGuid) {
		// Parent for knowledge remains knowledge; otherwise goal
		targetPayloadTypes =
			payloadType == payloadTypes.enum.knowledge
				? [payloadTypes.enum.knowledge]
				: [payloadTypes.enum.goal];
	} else if (payloadType == payloadTypes.enum.task) {
		// Parent for a task is a goal
		targetPayloadTypes = [payloadTypes.enum.goal];
	} else {
		// No applicable parent type → no options
		return Promise.resolve([]);
	}

	// Fetch broadly to maximize cache reuse: only by parent payloadType.
	// Do NOT use isPartOfMeasure/isPartOfProgram nor organization/organizationalUnit here;
	// filter those constraints in the component.
	return fetchContainers(
		{
			payloadType: targetPayloadTypes
		},
		'alpha'
	) as Promise<Container[]>;
}
