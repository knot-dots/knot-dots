import fetchContainers from '$lib/client/fetchContainers';
import type { Container, PayloadType } from '$lib/models';
import { payloadTypes } from '$lib/models';

// Centralized loader for parent options used by EditableParent and others.
export function createIsPartOfOptionsRequest(
	payloadType: PayloadType,
	organization: string,
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

	// Fetch, now constrained by organization if provided for narrower option set
	return fetchContainers(
		{
			payloadType: targetPayloadTypes,
			organization: [organization]
		},
		'alpha'
	) as Promise<Container[]>;
}
