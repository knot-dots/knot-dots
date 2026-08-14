import { expect, test } from 'vitest';
import {
	anyContainer,
	type AnyPayload,
	type Container,
	createCopyOf,
	createDescendantCopyOf,
	createIndividualProfileCopyOf,
	createRootCopyOf,
	createTemplateInstanceOf,
	editorialState,
	isOrganizationalUnitContainer,
	isTemplateContainer,
	newContainer,
	organizationalUnitType,
	type PayloadType,
	payloadTypes,
	predicates,
	resourceDataTypes,
	status,
	visibility
} from '$lib/models';

const sourceOrganization = '1d048b81-780a-41ad-813e-5111a23099fb';
const targetOrganization = 'f6709c05-a072-4f6b-ab35-ec26eeb9dfc6';
const targetOrganizationalUnit = '304bd9e4-55d9-410f-93fb-38a152635b64';
const sourceGuid = 'a94a926f-d156-45d2-961f-f55f5bcdb004';
const relatedGuid = '69e732e4-fb80-44e8-a465-00b593843764';

const payloadSchemas = anyContainer.shape.payload.options;

const testContainer = anyContainer.extend({
	computed_managed_by: anyContainer.shape.computed_managed_by.default([sourceOrganization]),
	guid: anyContainer.shape.guid.default(sourceGuid),
	managed_by: anyContainer.shape.managed_by.default([sourceOrganization]),
	organization: anyContainer.shape.organization.default(sourceOrganization),
	organizational_unit: anyContainer.shape.organizational_unit.default(null),
	realm: anyContainer.shape.realm.default('knot-dots'),
	relation: anyContainer.shape.relation.default([
		{
			object: relatedGuid,
			position: 4,
			predicate: predicates.enum['is-part-of'],
			subject: sourceGuid
		}
	]),
	revision: anyContainer.shape.revision.default(1),
	user: anyContainer.shape.user.default([
		{ predicate: predicates.enum['is-member-of'], subject: relatedGuid }
	]),
	valid_currently: anyContainer.shape.valid_currently.default(true),
	valid_from: anyContainer.shape.valid_from.default(new Date('2026-01-01T00:00:00.000Z'))
});

function payloadSchema(type: PayloadType) {
	const schema = payloadSchemas.find(({ shape }) => shape.type.value === type);

	if (!schema) {
		throw new Error(`Missing payload schema for ${type}`);
	}

	return schema;
}

function requiredPayloadFields(type: PayloadType) {
	switch (type) {
		case payloadTypes.enum.actual_data:
			return { indicator: relatedGuid };
		case payloadTypes.enum.chapter:
			return { number: '1' };
		case payloadTypes.enum.indicator_template:
			return { unit: 'unit.percent' };
		case payloadTypes.enum.organization:
		case payloadTypes.enum.organizational_unit:
			return { name: 'Context' };
		case payloadTypes.enum.page:
			return { body: 'Body' };
		case payloadTypes.enum.resource_data:
			return {
				resource: relatedGuid,
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget']
			};
		case payloadTypes.enum.resource_data_collection:
			return { resourceDataType: resourceDataTypes.enum['resource_data_type.budget'] };
		default:
			return {};
	}
}

function payloadFor(type: PayloadType, overrides: Record<string, unknown> = {}): AnyPayload {
	const schema = payloadSchema(type);
	const title = 'title' in schema.shape ? { title: 'Title' } : {};

	return schema.parse({
		type,
		...title,
		...requiredPayloadFields(type),
		...overrides
	}) as AnyPayload;
}

function sourceFor(
	type: PayloadType,
	overrides: Record<string, unknown> = {}
): Container<AnyPayload> {
	return testContainer.parse({ payload: payloadFor(type, overrides) });
}

function expectNoSharedReferences(source: unknown, copy: unknown) {
	if (source === null || copy === null || typeof source !== 'object' || typeof copy !== 'object') {
		return;
	}

	expect(copy).not.toBe(source);

	if (Array.isArray(source) && Array.isArray(copy)) {
		for (let i = 0; i < Math.min(source.length, copy.length); i++) {
			expectNoSharedReferences(source[i], copy[i]);
		}
		return;
	}

	if (!Array.isArray(source) && !Array.isArray(copy)) {
		for (const key of Object.keys(source)) {
			if (key in copy) {
				expectNoSharedReferences(
					(source as Record<string, unknown>)[key],
					(copy as Record<string, unknown>)[key]
				);
			}
		}
	}
}

test('returns a valid isolated NewContainer for every active payload', () => {
	for (const schema of payloadSchemas) {
		const type = schema.shape.type.value;
		const source = sourceFor(type);
		const sourceBeforeCopy = structuredClone(source);
		const copy = createCopyOf(source, targetOrganization, targetOrganizationalUnit);

		expect(source, type).toEqual(sourceBeforeCopy);
		expect(copy.payload, type).toEqual(source.payload);
		expect(newContainer.safeParse(copy).success, type).toBe(true);
		expect(copy.organization, type).toBe(targetOrganization);
		expect(copy.organizational_unit, type).toBe(
			type === payloadTypes.enum.organizational_unit ? null : targetOrganizationalUnit
		);
		expect(copy.managed_by, type).toEqual([
			type === payloadTypes.enum.organizational_unit ? targetOrganization : targetOrganizationalUnit
		]);
		expect(copy.realm, type).toBe(source.realm);
		expect(copy.user, type).toEqual([]);
		expect(copy.relation, type).toEqual([
			{
				object: source.guid,
				position: 0,
				predicate: predicates.enum['is-copy-of']
			}
		]);
		expectNoSharedReferences(source.payload, copy.payload);
	}
});

test('applies root-only identifiers and selected root visibility', () => {
	for (const [type, identifier] of [
		[payloadTypes.enum.category, 'key'],
		[payloadTypes.enum.term, 'value']
	] as const) {
		const source = sourceFor(type, {
			[identifier]: 'stable-value',
			visibility: visibility.enum.public
		});
		const sourceBeforeCopy = structuredClone(source);
		const neutralCopy = createCopyOf(source, targetOrganization, null);
		const rootCopy = createRootCopyOf(source, targetOrganization, null, visibility.enum.members);

		expect(source).toEqual(sourceBeforeCopy);
		expect(neutralCopy.payload).toHaveProperty(identifier, 'stable-value');
		expect(rootCopy.payload).not.toHaveProperty(identifier);
		expect(rootCopy.payload.visibility).toBe(visibility.enum.members);
		expect(newContainer.safeParse(rootCopy).success).toBe(true);
	}
});

test('uses the more restrictive visibility for descendants and preserves term values', () => {
	const rank = new Map(visibility.options.map((value, index) => [value, index]));

	for (const sourceVisibility of visibility.options) {
		for (const rootVisibility of visibility.options) {
			const source = sourceFor(payloadTypes.enum.term, {
				value: 'stable-value',
				visibility: sourceVisibility
			});
			const sourceBeforeCopy = structuredClone(source);
			const copy = createDescendantCopyOf(source, targetOrganization, null, rootVisibility);
			const expected =
				(rank.get(sourceVisibility) as number) <= (rank.get(rootVisibility) as number)
					? sourceVisibility
					: rootVisibility;

			expect(source).toEqual(sourceBeforeCopy);
			expect(copy.payload.visibility, `${sourceVisibility}/${rootVisibility}`).toBe(expected);
			expect(copy.payload).toHaveProperty('value', 'stable-value');
		}
	}
});

test('template instantiation changes only the template flag', () => {
	const source = sourceFor(payloadTypes.enum.measure, {
		aiSuggestion: true,
		editorialState: editorialState.enum['editorial_state.approved'],
		endDate: '2026-12-31',
		progress: 80,
		startDate: '2026-01-01',
		status: status.enum['status.done'],
		template: true,
		visibility: visibility.enum.members
	});
	const sourceBeforeCopy = structuredClone(source);

	if (!isTemplateContainer(source)) {
		throw new Error('Expected a template container');
	}

	const copy = createTemplateInstanceOf(source, targetOrganization, targetOrganizationalUnit);

	expect(source).toEqual(sourceBeforeCopy);
	expect(copy.payload).toEqual({ ...source.payload, template: false });
	expect(newContainer.safeParse(copy).success).toBe(true);
});

test('identifies every active template container', () => {
	for (const schema of payloadSchemas) {
		const type = schema.shape.type.value as PayloadType;
		const supportsTemplates = 'template' in schema.shape;
		const source = sourceFor(type, supportsTemplates ? { template: true } : {});

		expect(isTemplateContainer(source), type).toBe(supportsTemplates);

		if (supportsTemplates) {
			expect(isTemplateContainer(sourceFor(type, { template: false })), `${type}: false`).toBe(
				false
			);
		}
	}
});

test('individual profile creation removes only conflicting profile identity fields', () => {
	const source = sourceFor(payloadTypes.enum.organizational_unit, {
		description: 'Description',
		officialMunicipalityKey: '12345678',
		officialRegionalCode: '123456789012',
		organizationalUnitType:
			organizationalUnitType.enum['organizational_unit_type.administrative_area'],
		slug: 'context',
		visibility: visibility.enum.members
	});

	if (!isOrganizationalUnitContainer(source)) {
		throw new Error('Expected an organizational unit container');
	}

	const sourceBeforeCopy = structuredClone(source);
	const { organizationalUnitType: _, slug: __, ...expectedPayload } = source.payload;
	const copy = createIndividualProfileCopyOf(source);

	expect(source).toEqual(sourceBeforeCopy);
	expect(copy.payload).toEqual(expectedPayload);
	expect(copy.payload).toMatchObject({
		officialMunicipalityKey: '12345678',
		officialRegionalCode: '123456789012'
	});
	expect(copy.organization).toBe(source.organization);
	expect(copy.organizational_unit).toBeNull();
	expect(copy.managed_by).toEqual([source.organization]);
	expect(copy.relation).toEqual([
		{
			object: source.guid,
			position: 0,
			predicate: predicates.enum['is-copy-of']
		},
		{
			object: source.guid,
			position: 0,
			predicate: predicates.enum['is-individual-profile-of']
		}
	]);
	expect(newContainer.safeParse(copy).success).toBe(true);
});
