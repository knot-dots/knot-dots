import fetchContainers from '$lib/client/fetchContainers';
import type { Container, PayloadType } from '$lib/models';
import { payloadTypes } from '$lib/models';

// Centralized loader for parent options used by EditableParent and others.
// Logs only when the network request is initiated.
export function createIsPartOfOptionsRequest(
	payloadType: PayloadType,
	organization: string,
	organizational_unit: string | null,
	measureGuid?: string,
	programGuid?: string
): Promise<Container[]> {
	if (measureGuid) {
		console.log('EditableParent:isPartOfOptionsRequest fired', {
			by: 'measure',
			measureGuid,
			payloadType: payloadTypes.enum.goal,
			organization,
			organizational_unit
		});
		return fetchContainers(
			{
				isPartOfMeasure: [measureGuid],
				payloadType: [payloadTypes.enum.goal],
				cache: '1'
			},
			'alpha'
		) as Promise<Container[]>;
	} else if (programGuid) {
		console.log('EditableParent:isPartOfOptionsRequest fired', {
			by: 'program',
			programGuid,
			payloadType:
				payloadType == payloadTypes.enum.knowledge
					? payloadTypes.enum.knowledge
					: payloadTypes.enum.goal,
			organization,
			organizational_unit
		});
		return fetchContainers(
			{
				isPartOfProgram: [programGuid],
				payloadType:
					payloadType == payloadTypes.enum.knowledge
						? [payloadTypes.enum.knowledge]
						: [payloadTypes.enum.goal],
				cache: '1'
			},
			'alpha'
		) as Promise<Container[]>;
	} else if (payloadType == payloadTypes.enum.task) {
		console.log('EditableParent:isPartOfOptionsRequest fired', {
			by: 'task',
			payloadType: payloadTypes.enum.goal,
			organization,
			organizational_unit
		});
		return fetchContainers(
			{
				organization: [organization],
				organizationalUnit: organizational_unit ? [organizational_unit] : [],
				payloadType: [payloadTypes.enum.goal],
				cache: '1'
			},
			'alpha'
		) as Promise<Container[]>;
	}

	return Promise.resolve([]);
}
