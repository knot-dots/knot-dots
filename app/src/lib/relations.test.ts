import { describe, expect, test } from 'vitest';
import { type AnyContainer, payloadTypes, predicates } from '$lib/models';
import {
	type Node,
	relatedObjectNodesByPredicate,
	relatedSubjectNodesByPredicate
} from '$lib/relations';

const containers = new Map<string, Node & { payload: Pick<AnyContainer['payload'], 'type'> }>([
	[
		'304bd9e4-55d9-410f-93fb-38a152635b64',
		{
			guid: '304bd9e4-55d9-410f-93fb-38a152635b64',
			payload: {
				type: payloadTypes.enum.effect
			},
			relation: [
				{
					object: '306617a4-32fe-4fb7-9fef-089518a585fa',
					position: 0,
					predicate: 'is-part-of',
					subject: '304bd9e4-55d9-410f-93fb-38a152635b64'
				}
			]
		}
	],
	[
		'306617a4-32fe-4fb7-9fef-089518a585fa',
		{
			guid: '306617a4-32fe-4fb7-9fef-089518a585fa',
			payload: {
				type: payloadTypes.enum.goal
			},
			relation: [
				{
					object: '81ccb970-fc62-435f-84a4-dec205730108',
					position: 0,
					predicate: 'is-part-of',
					subject: '306617a4-32fe-4fb7-9fef-089518a585fa'
				},
				{
					object: '81ccb970-fc62-435f-84a4-dec205730108',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '306617a4-32fe-4fb7-9fef-089518a585fa'
				}
			]
		}
	],
	[
		'f88cd1df-e930-410d-8274-f900c83a4b16',
		{
			guid: 'f88cd1df-e930-410d-8274-f900c83a4b16',
			payload: {
				type: payloadTypes.enum.goal
			},
			relation: [
				{
					object: 'c4c09b96-1cb3-4fd4-aeba-af4dd4c9cd67',
					position: 0,
					predicate: 'is-part-of',
					subject: 'f88cd1df-e930-410d-8274-f900c83a4b16'
				},
				{
					object: 'c4c09b96-1cb3-4fd4-aeba-af4dd4c9cd67',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: 'f88cd1df-e930-410d-8274-f900c83a4b16'
				}
			]
		}
	],
	[
		'7da47ade-128c-4c55-aea4-bc11502b16ca',
		{
			guid: '7da47ade-128c-4c55-aea4-bc11502b16ca',
			payload: {
				type: payloadTypes.enum.effect
			},
			relation: [
				{
					object: 'c4c09b96-1cb3-4fd4-aeba-af4dd4c9cd67',
					position: 0,
					predicate: 'is-part-of',
					subject: '7da47ade-128c-4c55-aea4-bc11502b16ca'
				}
			]
		}
	],
	[
		'899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
		{
			guid: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
			payload: {
				type: payloadTypes.enum.measure
			},
			relation: [
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '706fa151-c541-45bd-ab2d-f0391665bda8'
				},
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '39b750a6-8afd-4be5-a832-fc8325808a6c'
				},
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '1e0e1c5a-449c-4c08-aaf5-d3745ae42cd3'
				},
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '88615c8b-ffc4-45d7-be1c-16ba32068eb5'
				},
				{
					object: '707d816d-6ee0-46f6-aee2-bca2d295566a',
					position: 0,
					predicate: 'is-part-of',
					subject: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4'
				},
				{
					object: 'f27b7194-1669-444a-ac0d-6380ed80e619',
					position: 0,
					predicate: 'is-part-of-program',
					subject: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4'
				}
			]
		}
	],
	[
		'706fa151-c541-45bd-ab2d-f0391665bda8',
		{
			guid: '706fa151-c541-45bd-ab2d-f0391665bda8',
			payload: {
				type: payloadTypes.enum.goal
			},
			relation: [
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '706fa151-c541-45bd-ab2d-f0391665bda8'
				}
			]
		}
	],
	[
		'39b750a6-8afd-4be5-a832-fc8325808a6c',
		{
			guid: '39b750a6-8afd-4be5-a832-fc8325808a6c',
			payload: {
				type: payloadTypes.enum.goal
			},
			relation: [
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '39b750a6-8afd-4be5-a832-fc8325808a6c'
				}
			]
		}
	],
	[
		'1e0e1c5a-449c-4c08-aaf5-d3745ae42cd3',
		{
			guid: '1e0e1c5a-449c-4c08-aaf5-d3745ae42cd3',
			payload: {
				type: payloadTypes.enum.goal
			},
			relation: [
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '1e0e1c5a-449c-4c08-aaf5-d3745ae42cd3'
				}
			]
		}
	],
	[
		'88615c8b-ffc4-45d7-be1c-16ba32068eb5',
		{
			guid: '88615c8b-ffc4-45d7-be1c-16ba32068eb5',
			payload: {
				type: payloadTypes.enum.resource
			},
			relation: [
				{
					object: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '88615c8b-ffc4-45d7-be1c-16ba32068eb5'
				}
			]
		}
	],
	[
		'707d816d-6ee0-46f6-aee2-bca2d295566a',
		{
			guid: '707d816d-6ee0-46f6-aee2-bca2d295566a',
			payload: {
				type: payloadTypes.enum.goal
			},
			relation: [
				{
					object: '707d816d-6ee0-46f6-aee2-bca2d295566a',
					position: 0,
					predicate: 'is-part-of',
					subject: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4'
				}
			]
		}
	],
	[
		'f27b7194-1669-444a-ac0d-6380ed80e619',
		{
			guid: 'f27b7194-1669-444a-ac0d-6380ed80e619',
			payload: {
				type: payloadTypes.enum.program
			},
			relation: [
				{
					object: 'f27b7194-1669-444a-ac0d-6380ed80e619',
					position: 0,
					predicate: 'is-part-of-program',
					subject: '899c59c1-d2fa-47b1-a87e-465c1ff7fec4'
				}
			]
		}
	]
]);

describe('relatedObjectNodesByPredicate', () => {
	test('899c59c1-d2fa-47b1-a87e-465c1ff7fec4 is part of 707d816d-6ee0-46f6-aee2-bca2d295566a', () => {
		const relatedContainers = relatedObjectNodesByPredicate(
			containers.get('899c59c1-d2fa-47b1-a87e-465c1ff7fec4') as Node,
			predicates.enum['is-part-of'],
			containers.values()
		).toArray();

		expect(relatedContainers).toMatchObject([
			expect.objectContaining({ guid: '707d816d-6ee0-46f6-aee2-bca2d295566a' })
		]);
	});

	test('899c59c1-d2fa-47b1-a87e-465c1ff7fec4 is part of program f27b7194-1669-444a-ac0d-6380ed80e619', () => {
		const relatedContainers = relatedObjectNodesByPredicate(
			containers.get('899c59c1-d2fa-47b1-a87e-465c1ff7fec4') as Node,
			predicates.enum['is-part-of-program'],
			containers.values()
		).toArray();

		expect(relatedContainers).toMatchObject([
			expect.objectContaining({ guid: 'f27b7194-1669-444a-ac0d-6380ed80e619' })
		]);
	});
});

describe('relatedSubjectNodesByPredicate', () => {
	test('899c59c1-d2fa-47b1-a87e-465c1ff7fec4 has parts ', () => {
		const relatedContainers = relatedSubjectNodesByPredicate(
			containers.get('899c59c1-d2fa-47b1-a87e-465c1ff7fec4') as Node,
			predicates.enum['is-part-of-measure'],
			containers.values()
		).toArray();

		expect(relatedContainers).toMatchObject([
			expect.objectContaining({ guid: '706fa151-c541-45bd-ab2d-f0391665bda8' }),
			expect.objectContaining({ guid: '39b750a6-8afd-4be5-a832-fc8325808a6c' }),
			expect.objectContaining({ guid: '1e0e1c5a-449c-4c08-aaf5-d3745ae42cd3' }),
			expect.objectContaining({ guid: '88615c8b-ffc4-45d7-be1c-16ba32068eb5' })
		]);
	});
});
