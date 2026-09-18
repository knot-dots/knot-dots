import { expect, test } from 'vitest';
import {
	anyContainer,
	type PayloadType,
	payloadTypes,
	predicates,
	type Relation,
	visibility
} from '$lib/models';
import {
	getDirectMeasureGuids,
	getTemplateScopeGuids,
	isScopedTemplateRoot,
	isTemplateScope,
	newTemplateScopePlacements,
	scopePlacementsRequireTemplate,
	requiresScopedTemplate
} from '$lib/templateScopes';

test.each(['measure', 'simple_measure'] as const)(
	'template requirement respects %s scope type',
	(type) => {
		const owner = anyContainer.parse({
			...template(),
			guid: parentGuid,
			payload: { type, title: 'Owner' },
			relation: []
		});
		const child = anyContainer.parse({
			...template(),
			payload: { type: 'goal', title: 'Child' },
			relation: [
				{ subject: templateGuid, object: parentGuid, predicate: 'is-part-of-measure', position: 0 }
			]
		});
		expect(requiresScopedTemplate(child)).toBe(true);
		expect(scopePlacementsRequireTemplate(child.relation, [child, owner])).toBe(true);
		expect(newTemplateScopePlacements(child.relation, child.relation)).toEqual([]);
		expect(
			requiresScopedTemplate({
				...child,
				relation: [{ object: parentGuid, predicate: 'is-section-of', position: 0 }]
			})
		).toBe(false);
	}
);

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const scopeGuid = '00000000-0000-4000-8000-000000000003';
const otherProgramGuid = '00000000-0000-4000-8000-000000000004';
const templateGuid = '00000000-0000-4000-8000-000000000005';
const parentGuid = '00000000-0000-4000-8000-000000000006';

function template({
	organization = organizationGuid,
	programs = [scopeGuid],
	template = true
}: {
	organization?: string;
	programs?: string[];
	template?: boolean;
} = {}) {
	return anyContainer.parse({
		guid: templateGuid,
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload: {
			template,
			title: 'Measure template',
			type: payloadTypes.enum.measure,
			visibility: visibility.enum.public
		},
		realm: 'realm',
		relation: programs.map((object) => ({
			object,
			position: 0,
			predicate: predicates.enum['is-available-in'],
			subject: templateGuid
		})),
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

test('accepts only a template root scoped exactly to the current program and organization', () => {
	expect(
		isScopedTemplateRoot(template(), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			scopeGuid
		})
	).toBe(true);

	expect(
		isScopedTemplateRoot(template({ programs: [] }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			scopeGuid
		})
	).toBe(false);
	expect(
		isScopedTemplateRoot(template({ programs: [scopeGuid, otherProgramGuid] }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			scopeGuid
		})
	).toBe(false);
	expect(
		isScopedTemplateRoot(template({ organization: otherOrganizationGuid }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			scopeGuid
		})
	).toBe(false);
	expect(
		isScopedTemplateRoot(template({ template: false }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			scopeGuid
		})
	).toBe(false);
});

test('rejects a scoped template that is structurally subordinate to another template', () => {
	const subordinate = template();
	subordinate.relation.push({
		object: otherProgramGuid,
		position: 0,
		predicate: predicates.enum['is-section-of'],
		subject: templateGuid
	});

	expect(
		isScopedTemplateRoot(subordinate, {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			scopeGuid
		})
	).toBe(false);
});

test('requires templates for direct program objects but not section-only containers', () => {
	const programPlacement = {
		object: scopeGuid,
		position: 0,
		predicate: predicates.enum['is-part-of-program']
	};
	const sectionPlacement = {
		object: parentGuid,
		position: 0,
		predicate: predicates.enum['is-section-of']
	};
	const measure = {
		...programObject(payloadTypes.enum.measure),
		relation: [programPlacement]
	};

	expect(requiresScopedTemplate(measure)).toBe(true);
	expect(requiresScopedTemplate({ ...measure, relation: [sectionPlacement] })).toBe(false);
	expect(
		requiresScopedTemplate({ ...measure, relation: [sectionPlacement, programPlacement] })
	).toBe(true);
	expect(
		requiresScopedTemplate({
			...programObject(payloadTypes.enum.text),
			relation: [programPlacement]
		})
	).toBe(false);
	expect(
		requiresScopedTemplate({
			...programObject(payloadTypes.enum.task),
			relation: [programPlacement]
		})
	).toBe(false);
});

function placement(position = 0): Relation {
	return {
		object: scopeGuid,
		position,
		predicate: predicates.enum['is-part-of-program'],
		subject: templateGuid
	};
}

function programObject(
	type:
		typeof payloadTypes.enum.text | typeof payloadTypes.enum.measure | typeof payloadTypes.enum.task
) {
	return anyContainer.parse({
		guid: templateGuid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload: {
			title: 'Object',
			type,
			visibility: visibility.enum.public
		},
		realm: 'realm',
		relation: [],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

test('detects only newly added program placements', () => {
	const sectionPlacement = {
		...placement(),
		predicate: predicates.enum['is-section-of']
	};

	expect(newTemplateScopePlacements([placement(4)], [placement(0)])).toEqual([]);
	expect(newTemplateScopePlacements([{ ...placement(), deleted: true }], [])).toEqual([]);
	expect(newTemplateScopePlacements([sectionPlacement], [])).toEqual([]);
	expect(newTemplateScopePlacements([placement()], [])).toEqual([placement()]);
});

test('requires the template-copy path for non-text program objects', () => {
	expect(
		scopePlacementsRequireTemplate([placement()], [programObject(payloadTypes.enum.measure)])
	).toBe(true);
	expect(
		scopePlacementsRequireTemplate([placement()], [programObject(payloadTypes.enum.text)])
	).toBe(false);
	expect(scopePlacementsRequireTemplate([placement()], [])).toBe(true);
});

function scopeOwner(type: PayloadType, guid = parentGuid) {
	return anyContainer.parse({
		...programObject(payloadTypes.enum.text),
		guid,
		payload: { title: 'Owner', type, visibility: visibility.enum.public }
	});
}

test('treats programs and both measure types as template scopes', () => {
	expect(isTemplateScope(scopeOwner(payloadTypes.enum.program))).toBe(true);
	expect(isTemplateScope(scopeOwner(payloadTypes.enum.measure))).toBe(true);
	expect(isTemplateScope(scopeOwner(payloadTypes.enum.simple_measure))).toBe(true);
	expect(isTemplateScope(scopeOwner(payloadTypes.enum.goal))).toBe(false);
});

test('collects deduplicated measure placements owned by the container itself', () => {
	const container = {
		...programObject(payloadTypes.enum.task),
		relation: [
			{
				object: parentGuid,
				position: 0,
				predicate: predicates.enum['is-part-of-measure'],
				subject: templateGuid
			},
			{
				object: parentGuid,
				position: 1,
				predicate: predicates.enum['is-part-of-measure'],
				subject: templateGuid
			},
			// An unsaved container has no guid on its own relations yet.
			{ object: scopeGuid, position: 0, predicate: predicates.enum['is-part-of-measure'] },
			{
				object: otherProgramGuid,
				position: 0,
				predicate: predicates.enum['is-part-of-program'],
				subject: templateGuid
			},
			{
				object: otherProgramGuid,
				position: 0,
				predicate: predicates.enum['is-part-of-measure'],
				subject: otherProgramGuid
			}
		]
	};

	expect(getDirectMeasureGuids(container)).toEqual([parentGuid, scopeGuid]);
	expect(getDirectMeasureGuids({ ...container, relation: [] })).toEqual([]);
});

test('resolves program and measure scopes directly', () => {
	const container = {
		...programObject(payloadTypes.enum.task),
		relation: [
			{ object: scopeGuid, position: 0, predicate: predicates.enum['is-part-of-program'] },
			{ object: parentGuid, position: 0, predicate: predicates.enum['is-part-of-measure'] }
		]
	};

	expect(getTemplateScopeGuids(container)).toEqual([scopeGuid, parentGuid]);
});
