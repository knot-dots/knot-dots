import { describe, expect, it } from 'vitest';
import {
	type CategoryContext,
	findCategoryGuid,
	findTermLabel,
	resolveCategoryTerms
} from '$lib/categoryOptions';
import {
	resolveColumnHeader,
	reverseTranslationMap,
	reverseTranslationMapForPayloadType,
	reverseTranslationMapForStatus
} from '$lib/server/csv';

const sampleCategoryContext: CategoryContext = {
	keys: ['cat-sdg-guid', 'cat-topic-guid', 'cat-custom-guid'],
	labels: new Map([
		['cat-sdg-guid', 'SDG'],
		['cat-topic-guid', 'Themenfeld'],
		['cat-custom-guid', 'Klimaziele']
	]),
	options: {
		'cat-sdg-guid': [
			{ label: '1 - Keine Armut', value: 'term-sdg-1' },
			{ label: '2 - Kein Hunger', value: 'term-sdg-2' },
			{ label: '13 - Maßnahmen zum Klimaschutz', value: 'term-sdg-13' }
		],
		'cat-topic-guid': [
			{ label: 'Mobilität und Erreichbarkeit', value: 'term-topic-mobility' },
			{ label: 'Energie', value: 'term-topic-energy' },
			{ label: 'Bildung', value: 'term-topic-education' }
		],
		'cat-custom-guid': [
			{ label: 'CO2-Reduktion', value: 'term-co2' },
			{ label: 'Klimaneutralität 2035', value: 'term-neutral-2035' }
		]
	},
	objectTypesPerKey: {}
};

describe('resolveColumnHeader', () => {
	it.each([
		['Titel', 'title'],
		['Beschreibung', 'description'],
		['Sichtbarkeit', 'visibility'],
		['Indikatoren-Set', 'indicatorCategory'],
		['Art des Indikators', 'indicatorType'],
		['Themenfeld', 'topic'],
		['SDG', 'sdg'],
		['Handlungsfeld (BNK 2.0)', 'policyFieldBNK'],
		['Wirkungsbereich', 'audience'],
		['Redaktionsstatus', 'editorialState'],
		['Organisations-Ebene', 'organizationalUnit'],
		['Einheit', 'unit']
	])('resolves the export header %j to the field %j without categoryContext', (header, key) => {
		expect(resolveColumnHeader(header)).toEqual({ type: 'field', key });
	});

	it('resolves headers with categoryContext to category GUIDs', () => {
		expect(resolveColumnHeader('SDG', sampleCategoryContext)).toEqual({
			type: 'category',
			categoryGuid: 'cat-sdg-guid'
		});
		expect(resolveColumnHeader('Themenfeld', sampleCategoryContext)).toEqual({
			type: 'category',
			categoryGuid: 'cat-topic-guid'
		});
		expect(resolveColumnHeader('Klimaziele', sampleCategoryContext)).toEqual({
			type: 'category',
			categoryGuid: 'cat-custom-guid'
		});
		expect(resolveColumnHeader('Topic', sampleCategoryContext)).toEqual({
			type: 'category',
			categoryGuid: 'cat-topic-guid'
		});
	});

	it('resolves four-digit headers to year columns', () => {
		expect(resolveColumnHeader('2024')).toEqual({ type: 'year', year: 2024 });
	});
});

describe('findCategoryGuid', () => {
	it('matches by exact category label', () => {
		expect(findCategoryGuid('SDG', sampleCategoryContext)).toBe('cat-sdg-guid');
		expect(findCategoryGuid('Themenfeld', sampleCategoryContext)).toBe('cat-topic-guid');
		expect(findCategoryGuid('Klimaziele', sampleCategoryContext)).toBe('cat-custom-guid');
	});

	it('matches by alias or legacy key', () => {
		expect(findCategoryGuid('topic', sampleCategoryContext)).toBe('cat-topic-guid');
		expect(findCategoryGuid('sdg', sampleCategoryContext)).toBe('cat-sdg-guid');
		expect(findCategoryGuid('Nr. des SDGs', sampleCategoryContext)).toBe('cat-sdg-guid');
	});

	it('returns GUID directly if passed a valid category GUID', () => {
		expect(findCategoryGuid('cat-custom-guid', sampleCategoryContext)).toBe('cat-custom-guid');
	});
});

describe('resolveCategoryTerms', () => {
	it('resolves terms by title label', () => {
		expect(
			resolveCategoryTerms('Mobilität und Erreichbarkeit', 'cat-topic-guid', sampleCategoryContext)
		).toEqual(['term-topic-mobility']);
		expect(
			resolveCategoryTerms(
				'Mobilität und Erreichbarkeit, Energie',
				'cat-topic-guid',
				sampleCategoryContext
			)
		).toEqual(['term-topic-mobility', 'term-topic-energy']);
	});

	it('resolves SDG terms by number or prefix', () => {
		expect(resolveCategoryTerms('1', 'cat-sdg-guid', sampleCategoryContext)).toEqual([
			'term-sdg-1'
		]);
		expect(resolveCategoryTerms('sdg.02', 'cat-sdg-guid', sampleCategoryContext)).toEqual([
			'term-sdg-2'
		]);
		expect(
			resolveCategoryTerms(
				'1 - Keine Armut, 13 - Maßnahmen zum Klimaschutz',
				'cat-sdg-guid',
				sampleCategoryContext
			)
		).toEqual(['term-sdg-1', 'term-sdg-13']);
	});

	it('resolves custom category terms', () => {
		expect(resolveCategoryTerms('CO2-Reduktion', 'cat-custom-guid', sampleCategoryContext)).toEqual(
			['term-co2']
		);
	});

	it('resolves array of terms and translation keys', () => {
		expect(
			resolveCategoryTerms(
				['topic.mobility', 'topic.education'],
				'cat-topic-guid',
				sampleCategoryContext
			)
		).toEqual(['term-topic-mobility', 'term-topic-education']);
	});
});

describe('findTermLabel', () => {
	it('finds term label by GUID', () => {
		expect(
			findTermLabel(sampleCategoryContext.options['cat-topic-guid'], 'term-topic-mobility')
		).toBe('Mobilität und Erreichbarkeit');
		expect(findTermLabel(sampleCategoryContext.options['cat-sdg-guid'], 'term-sdg-13')).toBe(
			'13 - Maßnahmen zum Klimaschutz'
		);
	});
});

describe('reverseTranslationMap', () => {
	it('maps indicator type labels to enum keys', () => {
		expect(reverseTranslationMap.get('Schlüsselindikator')).toBe('indicator_type.key');
		expect(reverseTranslationMap.get('Leistungsindikator')).toBe('indicator_type.performance');
		expect(reverseTranslationMap.get('Wirkungsindikator')).toBe('indicator_type.impact');
	});
});

describe('reverseTranslationMapForStatus', () => {
	it.each([
		['Idee', 'status.idea'],
		['In Planung', 'status.in_planning'],
		['In Umsetzung', 'status.in_implementation'],
		['In Betrieb', 'status.in_operation'],
		['Abgeschlossen', 'status.done'],
		['Verworfen', 'status.rejected']
	])('maps the status label %j as shown in the UI to %j', (label, value) => {
		expect(reverseTranslationMapForStatus.get(label)).toBe(value);
	});

	it('does not know labels of other enums', () => {
		expect(reverseTranslationMapForStatus.get('Erledigt')).toBeUndefined();
		expect(reverseTranslationMapForStatus.get('Beschlossen')).toBeUndefined();
	});
});

describe('reverseTranslationMapForPayloadType', () => {
	it.each([
		['Aufgabe', 'task'],
		['Einfache Maßnahme', 'simple_measure'],
		['Maßnahme', 'measure'],
		['Programm', 'program'],
		['Wissen', 'knowledge'],
		['Ziel', 'goal']
	])('maps the payload type label %j as shown in the UI to %j', (label, value) => {
		expect(reverseTranslationMapForPayloadType.get(label)).toBe(value);
	});
});
