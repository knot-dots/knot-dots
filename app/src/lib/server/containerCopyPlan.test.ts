import { expect, test } from 'vitest';
import {
	anyContainer,
	type AnyPayload,
	type Container,
	newContainer,
	payloadTypes,
	predicates,
	resourceDataTypes,
	type Relation,
	visibility
} from '$lib/models';
import {
	CopyPlanError,
	createContainerCopyPlan as createRawContainerCopyPlan,
	type CopyReadPolicy,
	type CopyTarget
} from '$lib/server/containerCopyPlan';

const organization = '10000000-0000-4000-8000-000000000000';
const organizationalUnit = '20000000-0000-4000-8000-000000000000';
const creator = '30000000-0000-4000-8000-000000000000';
const geometry = '40000000-0000-4000-8000-000000000000';

const guids = {
	root: '00000000-0000-4000-8000-000000000001',
	hidden: '00000000-0000-4000-8000-000000000002',
	pruned: '00000000-0000-4000-8000-000000000003',
	parent: '00000000-0000-4000-8000-000000000004',
	child: '00000000-0000-4000-8000-000000000005',
	dependency: '00000000-0000-4000-8000-000000000006',
	dependencyChild: '00000000-0000-4000-8000-000000000007',
	publicDependency: '00000000-0000-4000-8000-000000000008',
	actualData: '00000000-0000-4000-8000-000000000009',
	publicItem: '00000000-0000-4000-8000-000000000010',
	privateItem: '00000000-0000-4000-8000-000000000011',
	inaccessibleItem: '00000000-0000-4000-8000-000000000012',
	usableTemplate: '00000000-0000-4000-8000-000000000013',
	unusableTemplate: '00000000-0000-4000-8000-000000000014',
	map: '00000000-0000-4000-8000-000000000015',
	resource: '00000000-0000-4000-8000-000000000016',
	resourceData: '00000000-0000-4000-8000-000000000017',
	publicResource: '00000000-0000-4000-8000-000000000018',
	publicResourceData: '00000000-0000-4000-8000-000000000019',
	missing: '00000000-0000-4000-8000-000000000099',
	external: '00000000-0000-4000-8000-000000000100'
} as const;

const copiedGuids = Array.from(
	{ length: 30 },
	(_, index) => `90000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
);

function makeContainer(guid: string, payload: Record<string, unknown>): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload,
		realm: 'test',
		revision: 1,
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

function relation(
	subject: string,
	predicate: Relation['predicate'],
	object: string,
	position = 0
): Relation {
	return { object, position, predicate, subject };
}

function graph(rootGuid: string, containers: Container<AnyPayload>[], relations: Relation[]) {
	return {
		rootGuid,
		containers: containers.map((container) => ({
			...container,
			relation: relations.filter(
				({ object, subject }) => object === container.guid || subject === container.guid
			)
		}))
	};
}

function allocator() {
	let index = 0;
	return () => copiedGuids[index++];
}

function policy(
	options: {
		hidden?: string[];
		retainedItems?: string[];
		usableTemplates?: string[];
	} = {}
): CopyReadPolicy {
	return {
		canReadSource: ({ guid }) => !(options.hidden ?? []).includes(guid),
		canRetainCollectionItem: ({ guid }) => (options.retainedItems ?? []).includes(guid),
		canUseNewItemTemplate: ({ guid }) => (options.usableTemplates ?? []).includes(guid)
	};
}

const target: CopyTarget = {
	organization,
	organizationalUnit,
	realm: 'target-realm',
	creatorGuid: creator
};

function createContainerCopyPlan(
	options: Omit<Parameters<typeof createRawContainerCopyPlan>[0], 'operation'> & {
		operation?: Parameters<typeof createRawContainerCopyPlan>[0]['operation'];
	}
) {
	const root =
		options.graph.containers.find(({ guid }) => guid === options.graph.rootGuid) ??
		options.graph.containers[0];
	if (!root) {
		throw new Error('Missing test root');
	}
	return createRawContainerCopyPlan({
		...options,
		operation: options.operation ?? { kind: 'copy', rootPayload: root.payload }
	});
}

function copyFor(plan: ReturnType<typeof createRawContainerCopyPlan>, originalGuid: string) {
	return plan.get(originalGuid);
}

test('prunes hidden paths, accepts an alternate parent, and preserves a structural cycle', () => {
	const containers = [
		makeContainer(guids.root, {
			title: 'Root',
			type: payloadTypes.enum.program,
			visibility: visibility.enum.organization
		}),
		makeContainer(guids.hidden, {
			body: 'Hidden',
			title: 'Hidden',
			type: payloadTypes.enum.page,
			visibility: visibility.enum.organization
		}),
		makeContainer(guids.pruned, {
			title: 'Pruned',
			type: payloadTypes.enum.text,
			visibility: visibility.enum.public
		}),
		makeContainer(guids.parent, {
			body: 'Parent',
			title: 'Parent',
			type: payloadTypes.enum.page,
			visibility: visibility.enum.public
		}),
		makeContainer(guids.child, {
			title: 'Child',
			type: payloadTypes.enum.text,
			visibility: visibility.enum.creator
		})
	];
	const relations = [
		relation(guids.hidden, predicates.enum['is-section-of'], guids.root, 1),
		relation(guids.pruned, predicates.enum['is-part-of-category'], guids.hidden, 2),
		relation(guids.parent, predicates.enum['is-part-of-program'], guids.root, 7),
		relation(guids.child, predicates.enum['is-part-of'], guids.hidden, 3),
		relation(guids.child, predicates.enum['is-part-of-measure'], guids.parent, 4),
		relation(guids.parent, predicates.enum['is-part-of-category'], guids.child, 6)
	];

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, containers, relations),
		target,
		readPolicy: policy({ hidden: [guids.hidden] }),
		allocateGuid: allocator()
	});

	expect([...plan.keys()]).toEqual([guids.root, guids.parent, guids.child]);
	expect(plan.has(guids.hidden)).toBe(false);
	expect(plan.has(guids.pruned)).toBe(false);
	expect(copyFor(plan, guids.child)?.payload.visibility).toBe(visibility.enum.creator);
	expect(copyFor(plan, guids.parent)?.payload.visibility).toBe(visibility.enum.organization);
	expect(copyFor(plan, guids.child)?.relation).toContainEqual({
		object: plan.get(guids.parent)?.guid,
		position: 4,
		predicate: predicates.enum['is-part-of-measure'],
		subject: plan.get(guids.child)?.guid
	});
	expect(copyFor(plan, guids.parent)?.relation).toContainEqual({
		object: plan.get(guids.child)?.guid,
		position: 6,
		predicate: predicates.enum['is-part-of-category'],
		subject: plan.get(guids.parent)?.guid
	});
	expect(
		[...plan.values()]
			.flatMap(({ relation }) => relation)
			.some(({ object }) => object === guids.hidden)
	).toBe(false);
});

test('retains indicator targets and excludes actual data and dependency descendants', () => {
	const containers = [
		makeContainer(guids.root, {
			achievedValues: [[2026, 4]],
			title: 'Effect',
			type: payloadTypes.enum.effect
		}),
		makeContainer(guids.child, {
			title: 'Objective',
			type: payloadTypes.enum.objective
		}),
		makeContainer(guids.actualData, {
			indicator: guids.dependency,
			title: 'Data',
			type: payloadTypes.enum.actual_data
		}),
		makeContainer(guids.dependency, {
			title: 'Private indicator',
			type: payloadTypes.enum.indicator_template,
			unit: 'unit.percent',
			visibility: visibility.enum.organization
		}),
		makeContainer(guids.dependencyChild, {
			title: 'Indicator section',
			type: payloadTypes.enum.text
		}),
		makeContainer(guids.publicDependency, {
			title: 'Public indicator',
			type: payloadTypes.enum.indicator_template,
			unit: 'unit.percent',
			visibility: visibility.enum.public
		}),
		makeContainer(guids.external, {
			title: 'External',
			type: payloadTypes.enum.text
		})
	];
	const relations = [
		relation(guids.child, predicates.enum['is-part-of'], guids.root),
		relation(guids.actualData, predicates.enum['is-section-of'], guids.root),
		relation(guids.root, predicates.enum['is-measured-by'], guids.dependency, 9),
		relation(guids.child, predicates.enum['is-objective-for'], guids.dependency, 10),
		relation(guids.child, predicates.enum['is-measured-by'], guids.publicDependency, 11),
		relation(guids.dependencyChild, predicates.enum['is-section-of'], guids.dependency, 12),
		relation(guids.external, predicates.enum['is-objective-for'], guids.dependency, 13),
		relation(guids.root, predicates.enum['is-copy-of'], guids.external)
	];

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, containers, relations),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(plan.has(guids.dependency)).toBe(false);
	expect(plan.has(guids.dependencyChild)).toBe(false);
	expect(plan.has(guids.publicDependency)).toBe(false);
	expect(plan.has(guids.actualData)).toBe(false);
	expect(copyFor(plan, guids.root)?.relation).toContainEqual({
		object: guids.dependency,
		position: 9,
		predicate: predicates.enum['is-measured-by'],
		subject: plan.get(guids.root)?.guid
	});
	expect(copyFor(plan, guids.child)?.relation).toContainEqual({
		object: guids.dependency,
		position: 10,
		predicate: predicates.enum['is-objective-for'],
		subject: plan.get(guids.child)?.guid
	});
	expect(copyFor(plan, guids.child)?.relation).toContainEqual({
		object: guids.publicDependency,
		position: 11,
		predicate: predicates.enum['is-measured-by'],
		subject: plan.get(guids.child)?.guid
	});
	expect(
		[...plan.values()]
			.flatMap(({ relation }) => relation)
			.filter(({ predicate }) => predicate === predicates.enum['is-copy-of'])
	).toHaveLength(plan.size);
	expect(
		[...plan.values()]
			.flatMap(({ relation }) => relation)
			.some(({ subject }) => subject === guids.external)
	).toBe(false);
});

test('retains private and public resource payload targets without copying them', () => {
	const containers = [
		makeContainer(guids.root, {
			title: 'Program',
			type: payloadTypes.enum.program
		}),
		makeContainer(guids.resourceData, {
			entries: [{ amount: 12, year: 2026 }],
			resource: guids.resource,
			resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
			title: 'Private resource data',
			type: payloadTypes.enum.resource_data
		}),
		makeContainer(guids.publicResourceData, {
			entries: [{ amount: 24, year: 2026 }],
			resource: guids.publicResource,
			resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
			title: 'Public resource data',
			type: payloadTypes.enum.resource_data
		}),
		makeContainer(guids.resource, {
			title: 'Private resource',
			type: payloadTypes.enum.resource_v2,
			visibility: visibility.enum.organization
		}),
		makeContainer(guids.publicResource, {
			title: 'Public resource',
			type: payloadTypes.enum.resource_v2,
			visibility: visibility.enum.public
		}),
		makeContainer(guids.dependencyChild, {
			title: 'Resource section',
			type: payloadTypes.enum.text
		})
	];
	const relations = [
		relation(guids.resourceData, predicates.enum['is-section-of'], guids.root),
		relation(guids.publicResourceData, predicates.enum['is-section-of'], guids.root),
		relation(guids.resource, predicates.enum['is-section-of'], guids.root),
		relation(guids.dependencyChild, predicates.enum['is-section-of'], guids.resource)
	];

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, containers, relations),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(copyFor(plan, guids.resourceData)?.payload).toMatchObject({
		entries: [{ amount: 12, year: 2026 }],
		resource: guids.resource
	});
	expect(copyFor(plan, guids.publicResourceData)?.payload).toMatchObject({
		entries: [{ amount: 24, year: 2026 }],
		resource: guids.publicResource
	});
	expect(plan.has(guids.resource)).toBe(false);
	expect(plan.has(guids.publicResource)).toBe(false);
	expect(plan.has(guids.dependencyChild)).toBe(false);
});

test('copies a resource and its structural descendants when the resource is the root', () => {
	const resource = makeContainer(guids.resource, {
		title: 'Resource',
		type: payloadTypes.enum.resource_v2
	});
	const child = makeContainer(guids.child, {
		title: 'Resource section',
		type: payloadTypes.enum.text
	});

	const plan = createContainerCopyPlan({
		graph: graph(
			guids.resource,
			[resource, child],
			[relation(guids.child, predicates.enum['is-section-of'], guids.resource)]
		),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect([...plan.keys()]).toEqual([guids.resource, guids.child]);
	expect(copyFor(plan, guids.child)?.relation).toContainEqual({
		object: plan.get(guids.resource)?.guid,
		position: 0,
		predicate: predicates.enum['is-section-of'],
		subject: plan.get(guids.child)?.guid
	});
});

test('rejects actual data roots and prunes actual data descendants unless another path survives', () => {
	const root = makeContainer(guids.root, {
		title: 'Program',
		type: payloadTypes.enum.program
	});
	const actualData = makeContainer(guids.actualData, {
		indicator: guids.dependency,
		title: 'Actual data',
		type: payloadTypes.enum.actual_data
	});
	const pruned = makeContainer(guids.pruned, {
		title: 'Pruned child',
		type: payloadTypes.enum.text
	});
	const alternate = makeContainer(guids.child, {
		title: 'Alternate child',
		type: payloadTypes.enum.text
	});
	const snapshot = graph(
		guids.root,
		[root, actualData, pruned, alternate],
		[
			relation(guids.actualData, predicates.enum['is-section-of'], guids.root),
			relation(guids.pruned, predicates.enum['is-section-of'], guids.actualData),
			relation(guids.child, predicates.enum['is-section-of'], guids.actualData),
			relation(guids.child, predicates.enum['is-part-of'], guids.root)
		]
	);

	const plan = createContainerCopyPlan({
		graph: snapshot,
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect([...plan.keys()]).toEqual([guids.root, guids.child]);
	expect(plan.has(guids.actualData)).toBe(false);
	expect(plan.has(guids.pruned)).toBe(false);
	expect(() =>
		createContainerCopyPlan({
			graph: graph(guids.actualData, [actualData], []),
			target,
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('unsupported_copy_source'));
});

test('prunes descendants with unresolved relation or payload references', () => {
	const root = makeContainer(guids.root, {
		title: 'Program',
		type: payloadTypes.enum.program
	});
	const effect = makeContainer(guids.parent, {
		achievedValues: [],
		title: 'Effect',
		type: payloadTypes.enum.effect
	});
	const resourceData = makeContainer(guids.resourceData, {
		resource: guids.missing,
		resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
		title: 'Resource data',
		type: payloadTypes.enum.resource_data
	});
	const effectChild = makeContainer(guids.child, {
		title: 'Effect child',
		type: payloadTypes.enum.text
	});
	const resourceDataChild = makeContainer(guids.pruned, {
		title: 'Resource data child',
		type: payloadTypes.enum.text
	});
	const validSibling = makeContainer(guids.hidden, {
		title: 'Valid sibling',
		type: payloadTypes.enum.text
	});

	const plan = createContainerCopyPlan({
		graph: graph(
			guids.root,
			[root, effect, resourceData, effectChild, resourceDataChild, validSibling],
			[
				relation(guids.parent, predicates.enum['is-section-of'], guids.root),
				relation(guids.parent, predicates.enum['is-measured-by'], guids.missing),
				relation(guids.child, predicates.enum['is-section-of'], guids.parent),
				relation(guids.resourceData, predicates.enum['is-section-of'], guids.root),
				relation(guids.pruned, predicates.enum['is-section-of'], guids.resourceData),
				relation(guids.hidden, predicates.enum['is-section-of'], guids.root)
			]
		),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect([...plan.keys()]).toEqual([guids.root, guids.hidden]);
	expect(plan.has(guids.parent)).toBe(false);
	expect(plan.has(guids.child)).toBe(false);
	expect(plan.has(guids.resourceData)).toBe(false);
	expect(plan.has(guids.pruned)).toBe(false);
});

test('remaps collection members without instantiating template references', () => {
	const containers = [
		makeContainer(guids.root, {
			item: [
				guids.child,
				guids.publicItem,
				guids.privateItem,
				guids.inaccessibleItem,
				guids.missing
			],
			newItemTemplate: [guids.child, guids.usableTemplate, guids.unusableTemplate],
			title: 'Collection',
			type: payloadTypes.enum.custom_collection
		}),
		makeContainer(guids.child, {
			template: true,
			title: 'Copied template',
			type: payloadTypes.enum.measure
		}),
		makeContainer(guids.publicItem, {
			title: 'Public item',
			type: payloadTypes.enum.text,
			visibility: visibility.enum.public
		}),
		makeContainer(guids.privateItem, {
			title: 'Private item',
			type: payloadTypes.enum.text
		}),
		makeContainer(guids.inaccessibleItem, {
			title: 'Inaccessible item',
			type: payloadTypes.enum.text
		}),
		makeContainer(guids.usableTemplate, {
			template: true,
			title: 'Usable template',
			type: payloadTypes.enum.report
		}),
		makeContainer(guids.unusableTemplate, {
			template: true,
			title: 'Unusable template',
			type: payloadTypes.enum.report
		}),
		makeContainer(guids.map, {
			geometry,
			title: 'Map',
			type: payloadTypes.enum.map
		})
	];
	const relations = [
		relation(guids.child, predicates.enum['is-part-of'], guids.root),
		relation(guids.map, predicates.enum['is-section-of'], guids.root)
	];
	const snapshot = graph(guids.root, containers, relations);
	const originalSnapshot = structuredClone(snapshot);

	const plan = createContainerCopyPlan({
		graph: snapshot,
		target,
		readPolicy: policy({
			hidden: [guids.inaccessibleItem],
			retainedItems: [guids.privateItem, guids.inaccessibleItem],
			usableTemplates: [guids.child, guids.usableTemplate]
		}),
		allocateGuid: allocator()
	});
	const collection = copyFor(plan, guids.root);

	expect(collection?.payload).toMatchObject({
		item: [plan.get(guids.child)?.guid, guids.publicItem, guids.privateItem],
		newItemTemplate: [guids.child, guids.usableTemplate]
	});
	expect(plan.has(guids.privateItem)).toBe(false);
	expect(plan.has(guids.usableTemplate)).toBe(false);
	expect(copyFor(plan, guids.map)?.payload).toMatchObject({ geometry });
	expect([...plan.values()].every((container) => newContainer.safeParse(container).success)).toBe(
		true
	);
	expect([...plan.values()].every((container) => container.user[0]?.subject === creator)).toBe(
		true
	);
	expect(snapshot).toEqual(originalSnapshot);
	if (collection?.payload.type !== payloadTypes.enum.custom_collection) {
		throw new Error('Expected a custom collection copy');
	}
	collection.payload.item.push(guids.external);
	expect(snapshot).toEqual(originalSnapshot);
});

test('uses the copied organizational unit as the ownership target for descendants', () => {
	const root = makeContainer(guids.root, {
		name: 'Copied unit',
		type: payloadTypes.enum.organizational_unit
	});
	const child = makeContainer(guids.child, {
		title: 'Child',
		type: payloadTypes.enum.text
	});

	const plan = createContainerCopyPlan({
		graph: graph(
			guids.root,
			[root, child],
			[relation(guids.child, predicates.enum['is-section-of'], guids.root)]
		),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});
	const copiedRootGuid = plan.get(guids.root)?.guid;

	expect(copyFor(plan, guids.root)).toMatchObject({
		managed_by: [organization],
		organizational_unit: null
	});
	expect(copyFor(plan, guids.child)).toMatchObject({
		managed_by: [copiedRootGuid],
		organizational_unit: copiedRootGuid
	});
});

test('remaps ordinary internal relations and drops ordinary external relations', () => {
	const root = makeContainer(guids.root, {
		title: 'Root',
		type: payloadTypes.enum.program
	});
	const child = makeContainer(guids.child, {
		title: 'Child',
		type: payloadTypes.enum.text
	});
	const external = makeContainer(guids.external, {
		title: 'External',
		type: payloadTypes.enum.text
	});

	const plan = createContainerCopyPlan({
		graph: graph(
			guids.root,
			[root, child, external],
			[
				relation(guids.child, predicates.enum['is-part-of'], guids.root),
				relation(guids.child, predicates.enum['is-consistent-with'], guids.root, 5),
				relation(guids.child, predicates.enum['is-consistent-with'], guids.external, 6)
			]
		),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});
	const childRelations = copyFor(plan, guids.child)?.relation ?? [];

	expect(childRelations).toContainEqual({
		object: plan.get(guids.root)?.guid,
		position: 5,
		predicate: predicates.enum['is-consistent-with'],
		subject: plan.get(guids.child)?.guid
	});
	expect(childRelations.some(({ object }) => object === guids.external)).toBe(false);
});

test('rejects missing and malformed required payload dependencies opaquely', () => {
	const missingDependency = makeContainer(guids.resourceData, {
		resource: guids.missing,
		resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
		title: 'Missing dependency',
		type: payloadTypes.enum.resource_data
	});
	const malformedDependency = makeContainer(guids.resourceData, {
		resource: guids.resource,
		resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
		title: 'Malformed dependency',
		type: payloadTypes.enum.resource_data
	});
	if (malformedDependency.payload.type !== payloadTypes.enum.resource_data) {
		throw new Error('Expected resource data');
	}
	malformedDependency.payload.resource = 'not-a-uuid';

	for (const root of [missingDependency, malformedDependency]) {
		expect(() =>
			createContainerCopyPlan({
				graph: graph(root.guid, [root], []),
				target,
				readPolicy: policy(),
				allocateGuid: allocator()
			})
		).toThrow(new CopyPlanError('required_dependency_unavailable'));
	}

	const unresolvedRelationRoot = makeContainer(guids.root, {
		achievedValues: [],
		title: 'Effect',
		type: payloadTypes.enum.effect
	});
	expect(() =>
		createContainerCopyPlan({
			graph: graph(
				guids.root,
				[unresolvedRelationRoot],
				[relation(guids.root, predicates.enum['is-measured-by'], guids.missing)]
			),
			target,
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('required_dependency_unavailable'));
});

test('rejects conflicting positions for the same relation', () => {
	const root = makeContainer(guids.root, {
		title: 'Root',
		type: payloadTypes.enum.program
	});
	const child = makeContainer(guids.child, {
		title: 'Child',
		type: payloadTypes.enum.text
	});

	expect(() =>
		createContainerCopyPlan({
			graph: graph(
				guids.root,
				[root, child],
				[
					relation(guids.child, predicates.enum['is-part-of'], guids.root, 1),
					relation(guids.child, predicates.enum['is-part-of'], guids.root, 2)
				]
			),
			target,
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('invalid_copy_graph'));
});

test.each([
	{ name: 'an invalid UUID', allocateGuid: () => 'not-a-uuid' },
	{ name: 'a duplicate UUID', allocateGuid: () => copiedGuids[0] },
	{ name: 'a source UUID', allocateGuid: () => guids.root }
])('rejects $name from the allocator', ({ allocateGuid }) => {
	const root = makeContainer(guids.root, {
		title: 'Root',
		type: payloadTypes.enum.program
	});
	const child = makeContainer(guids.child, {
		title: 'Child',
		type: payloadTypes.enum.text
	});

	expect(() =>
		createContainerCopyPlan({
			graph: graph(
				guids.root,
				[root, child],
				[relation(guids.child, predicates.enum['is-part-of'], guids.root)]
			),
			target,
			readPolicy: policy(),
			allocateGuid
		})
	).toThrow(new CopyPlanError('invalid_copy_graph'));
});

test('rejects a final copy that does not satisfy the NewContainer schema', () => {
	const root = makeContainer(guids.root, {
		title: 'Root',
		type: payloadTypes.enum.program
	});

	expect(() =>
		createContainerCopyPlan({
			graph: graph(guids.root, [root], []),
			target: { ...target, creatorGuid: 'not-a-uuid' },
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('invalid_copy_graph'));
});

test('uses opaque failures for unreadable roots but retains unreadable reference targets', () => {
	const root = makeContainer(guids.root, {
		achievedValues: [],
		title: 'Secret root',
		type: payloadTypes.enum.effect
	});
	const dependency = makeContainer(guids.dependency, {
		title: 'Secret dependency',
		type: payloadTypes.enum.indicator_template,
		unit: 'unit.percent'
	});
	const snapshot = graph(
		guids.root,
		[root, dependency],
		[relation(guids.root, predicates.enum['is-measured-by'], guids.dependency)]
	);
	const missingRootSnapshot = graph(guids.missing, [root], []);

	expect(() =>
		createContainerCopyPlan({
			graph: missingRootSnapshot,
			target,
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('source_unavailable'));
	expect(() =>
		createContainerCopyPlan({
			graph: snapshot,
			target,
			readPolicy: policy({ hidden: [guids.root] }),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('source_unavailable'));
	const plan = createContainerCopyPlan({
		graph: snapshot,
		target,
		readPolicy: policy({ hidden: [guids.dependency] }),
		allocateGuid: allocator()
	});
	expect(plan.has(guids.dependency)).toBe(false);
	expect(copyFor(plan, guids.root)?.relation).toContainEqual({
		object: guids.dependency,
		position: 0,
		predicate: predicates.enum['is-measured-by'],
		subject: plan.get(guids.root)?.guid
	});
});

test('applies edited root payloads before remapping nested container references', () => {
	const root = makeContainer(guids.root, {
		item: [],
		newItemTemplate: [],
		title: 'Source title',
		type: payloadTypes.enum.custom_collection
	});
	const child = makeContainer(guids.child, {
		title: 'Child',
		type: payloadTypes.enum.text
	});
	const sourcePayload = structuredClone(root.payload);
	const editedPayload = {
		...root.payload,
		item: [guids.child],
		title: 'Edited title',
		visibility: visibility.enum.members
	};

	const plan = createContainerCopyPlan({
		graph: graph(
			guids.root,
			[root, child],
			[relation(guids.child, predicates.enum['is-part-of'], guids.root)]
		),
		target,
		operation: { kind: 'copy', rootPayload: editedPayload },
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(copyFor(plan, guids.root)?.payload).toMatchObject({
		item: [plan.get(guids.child)?.guid],
		title: 'Edited title',
		visibility: visibility.enum.members
	});
	expect(root.payload).toEqual(sourcePayload);
	expect(editedPayload.item).toEqual([guids.child]);
});

test('rejects an edited root payload whose type differs from the source', () => {
	const root = makeContainer(guids.root, {
		title: 'Program',
		type: payloadTypes.enum.program
	});
	const wrongPayload = makeContainer(guids.child, {
		title: 'Text',
		type: payloadTypes.enum.text
	}).payload;

	expect(() =>
		createContainerCopyPlan({
			graph: graph(guids.root, [root], []),
			target,
			operation: { kind: 'copy', rootPayload: wrongPayload },
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('payload_type_mismatch'));
});

test('changes template state only for explicit template instantiation', () => {
	const root = makeContainer(guids.root, {
		template: true,
		title: 'Template',
		type: payloadTypes.enum.report
	});
	const snapshot = graph(guids.root, [root], []);
	const ordinary = createContainerCopyPlan({
		graph: snapshot,
		target,
		operation: { kind: 'copy', rootPayload: root.payload },
		readPolicy: policy(),
		allocateGuid: allocator()
	});
	const instantiated = createContainerCopyPlan({
		graph: snapshot,
		target,
		operation: { kind: 'template-instance', rootPayload: root.payload },
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(copyFor(ordinary, guids.root)?.payload).toMatchObject({ template: true });
	expect(copyFor(instantiated, guids.root)?.payload).toMatchObject({ template: false });
});

test('creates a template hierarchy and marks every templatable container as a template', () => {
	const root = makeContainer(guids.root, {
		title: 'Program',
		type: payloadTypes.enum.program
	});
	const child = makeContainer(guids.child, {
		title: 'Goal',
		type: payloadTypes.enum.goal
	});
	const support = makeContainer(guids.dependencyChild, {
		body: 'Supporting content',
		title: 'Page',
		type: payloadTypes.enum.page
	});
	const relations = [
		relation(guids.child, predicates.enum['is-part-of-program'], guids.root),
		relation(guids.dependencyChild, predicates.enum['is-section-of'], guids.child)
	];
	if (root.payload.type !== payloadTypes.enum.program) {
		throw new Error('Expected a program');
	}

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, [root, child, support], relations),
		target,
		operation: {
			kind: 'create-template',
			rootPayload: { ...root.payload, title: 'Edited program template', template: false }
		},
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(copyFor(plan, guids.root)?.payload).toMatchObject({
		template: true,
		title: 'Edited program template'
	});
	expect(copyFor(plan, guids.child)?.payload).toMatchObject({
		template: true
	});
	expect(copyFor(plan, guids.dependencyChild)?.payload).not.toHaveProperty('template');
	expect(root.payload).toMatchObject({ template: false, title: 'Program' });
});

test('clears template state from every templatable descendant when instantiating a template', () => {
	const root = makeContainer(guids.root, {
		template: true,
		title: 'Program template',
		type: payloadTypes.enum.program
	});
	const child = makeContainer(guids.child, {
		template: true,
		title: 'Goal template',
		type: payloadTypes.enum.goal
	});
	const relations = [relation(guids.child, predicates.enum['is-part-of-program'], guids.root)];

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, [root, child], relations),
		target,
		operation: { kind: 'template-instance', rootPayload: root.payload },
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(copyFor(plan, guids.root)?.payload).toMatchObject({ template: false });
	expect(copyFor(plan, guids.child)?.payload).toMatchObject({ template: false });
});

test('rejects creating a template from an existing template or a non-templatable root', () => {
	const template = makeContainer(guids.root, {
		template: true,
		title: 'Existing template',
		type: payloadTypes.enum.program
	});
	const page = makeContainer(guids.root, {
		body: 'Body',
		title: 'Page',
		type: payloadTypes.enum.page
	});

	expect(() =>
		createContainerCopyPlan({
			graph: graph(guids.root, [template], []),
			target,
			operation: { kind: 'create-template', rootPayload: template.payload },
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('unsupported_copy_source'));
	expect(() =>
		createContainerCopyPlan({
			graph: graph(guids.root, [page], []),
			target,
			operation: { kind: 'create-template', rootPayload: page.payload },
			readPolicy: policy(),
			allocateGuid: allocator()
		})
	).toThrow(new CopyPlanError('payload_type_mismatch'));
});

test('applies only the explicit individual-profile root policy and provenance', () => {
	const root = makeContainer(guids.root, {
		name: 'Municipality',
		slug: 'municipality',
		type: payloadTypes.enum.organizational_unit
	});

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, [root], []),
		target,
		operation: { kind: 'individual-profile' },
		readPolicy: policy(),
		allocateGuid: allocator()
	});
	const profile = copyFor(plan, guids.root);

	expect(profile?.payload).not.toHaveProperty('slug');
	expect(profile?.relation).toContainEqual({
		object: guids.root,
		position: 0,
		predicate: predicates.enum['is-individual-profile-of'],
		subject: plan.get(guids.root)?.guid
	});
	expect(root.payload).toHaveProperty('slug', 'municipality');
});

test('remaps a reference target that is independently included through a structural path', () => {
	const root = makeContainer(guids.root, {
		achievedValues: [],
		title: 'Effect',
		type: payloadTypes.enum.effect
	});
	const dependency = makeContainer(guids.dependency, {
		title: 'Shared indicator',
		type: payloadTypes.enum.indicator_template,
		unit: 'unit.percent'
	});

	const plan = createContainerCopyPlan({
		graph: graph(
			guids.root,
			[root, dependency],
			[
				relation(guids.root, predicates.enum['is-measured-by'], guids.dependency),
				relation(guids.dependency, predicates.enum['is-section-of'], guids.root)
			]
		),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect(plan.has(guids.dependency)).toBe(true);
	expect(copyFor(plan, guids.root)?.relation).toContainEqual({
		object: plan.get(guids.dependency)?.guid,
		position: 0,
		predicate: predicates.enum['is-measured-by'],
		subject: plan.get(guids.root)?.guid
	});
});

test('plans mixed-depth program, measure, goal, task, effect, category, report, and section branches', () => {
	const taskGuid = '00000000-0000-4000-8000-000000000020';
	const effectGuid = '00000000-0000-4000-8000-000000000021';
	const categoryGuid = '00000000-0000-4000-8000-000000000022';
	const reportGuid = '00000000-0000-4000-8000-000000000023';
	const sectionGuid = '00000000-0000-4000-8000-000000000024';
	const containers = [
		makeContainer(guids.root, { title: 'Program', type: payloadTypes.enum.program }),
		makeContainer(guids.parent, { title: 'Measure', type: payloadTypes.enum.measure }),
		makeContainer(guids.child, { title: 'Goal', type: payloadTypes.enum.goal }),
		makeContainer(taskGuid, { title: 'Task', type: payloadTypes.enum.task }),
		makeContainer(effectGuid, {
			achievedValues: [],
			title: 'Effect',
			type: payloadTypes.enum.effect
		}),
		makeContainer(categoryGuid, { title: 'Category', type: payloadTypes.enum.category }),
		makeContainer(reportGuid, { title: 'Report', type: payloadTypes.enum.report }),
		makeContainer(sectionGuid, { title: 'Section', type: payloadTypes.enum.text })
	];
	const relations = [
		relation(guids.parent, predicates.enum['is-part-of-program'], guids.root, 4),
		relation(categoryGuid, predicates.enum['is-part-of-program'], guids.root, 8),
		relation(guids.child, predicates.enum['is-part-of-measure'], guids.parent, 2),
		relation(taskGuid, predicates.enum['is-part-of'], guids.child, 5),
		relation(effectGuid, predicates.enum['is-part-of'], guids.child, 6),
		relation(reportGuid, predicates.enum['is-part-of-category'], categoryGuid, 3),
		relation(sectionGuid, predicates.enum['is-section-of'], reportGuid, 7)
	];

	const plan = createContainerCopyPlan({
		graph: graph(guids.root, containers, relations),
		target,
		readPolicy: policy(),
		allocateGuid: allocator()
	});

	expect([...plan.keys()]).toHaveLength(containers.length);
	expect(copyFor(plan, guids.parent)?.relation).toContainEqual({
		object: plan.get(guids.root)?.guid,
		position: 4,
		predicate: predicates.enum['is-part-of-program'],
		subject: plan.get(guids.parent)?.guid
	});
	expect(copyFor(plan, sectionGuid)?.relation).toContainEqual({
		object: plan.get(reportGuid)?.guid,
		position: 7,
		predicate: predicates.enum['is-section-of'],
		subject: plan.get(sectionGuid)?.guid
	});
});
