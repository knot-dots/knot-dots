import { expect, test } from 'vitest';
import { anyContainer, payloadTypes, predicates, type Relation, visibility } from '$lib/models';
import {
	isProgramScopedTemplateRoot,
	newProgramPlacements,
	programPlacementsRequireTemplate,
	requiresProgramTemplate
} from '$lib/programTemplates';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const programGuid = '00000000-0000-4000-8000-000000000003';
const otherProgramGuid = '00000000-0000-4000-8000-000000000004';
const templateGuid = '00000000-0000-4000-8000-000000000005';
const parentGuid = '00000000-0000-4000-8000-000000000006';

function template({
	organization = organizationGuid,
	programs = [programGuid],
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
		isProgramScopedTemplateRoot(template(), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			programGuid
		})
	).toBe(true);

	expect(
		isProgramScopedTemplateRoot(template({ programs: [] }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			programGuid
		})
	).toBe(false);
	expect(
		isProgramScopedTemplateRoot(template({ programs: [programGuid, otherProgramGuid] }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			programGuid
		})
	).toBe(false);
	expect(
		isProgramScopedTemplateRoot(template({ organization: otherOrganizationGuid }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			programGuid
		})
	).toBe(false);
	expect(
		isProgramScopedTemplateRoot(template({ template: false }), {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			programGuid
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
		isProgramScopedTemplateRoot(subordinate, {
			organizationGuid,
			payloadType: payloadTypes.enum.measure,
			programGuid
		})
	).toBe(false);
});

test('requires templates for direct program objects but not section-only containers', () => {
	const programPlacement = {
		object: programGuid,
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

	expect(requiresProgramTemplate(measure)).toBe(true);
	expect(requiresProgramTemplate({ ...measure, relation: [sectionPlacement] })).toBe(false);
	expect(
		requiresProgramTemplate({ ...measure, relation: [sectionPlacement, programPlacement] })
	).toBe(true);
	expect(
		requiresProgramTemplate({
			...programObject(payloadTypes.enum.text),
			relation: [programPlacement]
		})
	).toBe(false);
	expect(
		requiresProgramTemplate({
			...programObject(payloadTypes.enum.task),
			relation: [programPlacement]
		})
	).toBe(false);
});

function placement(position = 0): Relation {
	return {
		object: programGuid,
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

	expect(newProgramPlacements([placement(4)], [placement(0)])).toEqual([]);
	expect(newProgramPlacements([{ ...placement(), deleted: true }], [])).toEqual([]);
	expect(newProgramPlacements([sectionPlacement], [])).toEqual([]);
	expect(newProgramPlacements([placement()], [])).toEqual([placement()]);
});

test('requires the template-copy path for non-text program objects', () => {
	expect(
		programPlacementsRequireTemplate([placement()], [programObject(payloadTypes.enum.measure)])
	).toBe(true);
	expect(
		programPlacementsRequireTemplate([placement()], [programObject(payloadTypes.enum.text)])
	).toBe(false);
	expect(programPlacementsRequireTemplate([placement()], [])).toBe(true);
});
