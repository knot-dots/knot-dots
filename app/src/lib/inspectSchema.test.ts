import { describe, expect, test } from 'vitest';
import { z, type ZodType } from 'zod';
import { inspectSchema } from '$lib/inspectSchema';
import { anyPayload, propertyRegistry } from '$lib/models';

const registeredProperties = anyPayload.options
	.flatMap((payloadSchema): [string, string, ZodType][] =>
		Object.entries(payloadSchema.shape).map((v) => [payloadSchema.shape.type.value, ...v])
	)
	.filter(([, key, schema]) => propertyRegistry.has(schema) && key !== 'pdf');

describe('inspectSchema', () => {
	test.for(registeredProperties)(
		`determines an unwrapped baseSchema for %s.%s`,
		([, , propertySchema]) => {
			const expectedBaseSchemaTypes = [z.ZodEnum, z.ZodNumber, z.ZodString, z.ZodStringFormat];

			const schemaInfo = inspectSchema(propertySchema);

			expect(
				expectedBaseSchemaTypes.some(
					(expectedType) => schemaInfo.baseSchema instanceof expectedType
				),
				`unexpected baseSchema ${schemaInfo.baseSchema.type}`
			).toBe(true);
		}
	);

	test('determines a suitable baseSchema for each ZodType kind used in payload object schemas', () => {
		// ZodEnum (e.g. editorialState, visibility, goalType)
		const enumSchema = z.enum(['alpha', 'beta']).optional();
		const enumInfo = inspectSchema(enumSchema);
		expect(enumInfo.baseSchema).toBeInstanceOf(z.ZodEnum);
		expect(enumInfo.isRequired).toBe(false);

		// ZodStringFormat - date (e.g. startDate, endDate, fulfillmentDate)
		const dateSchema = z.iso.date().optional();
		const dateInfo = inspectSchema(dateSchema);
		expect(dateInfo.baseSchema).toBeInstanceOf(z.ZodStringFormat);
		expect(dateInfo.isRequired).toBe(false);

		// ZodStringFormat - datetime (e.g. publicationDate)
		const datetimeSchema = z.iso.datetime();
		const datetimeInfo = inspectSchema(datetimeSchema);
		expect(datetimeInfo.baseSchema).toBeInstanceOf(z.ZodStringFormat);
		expect(datetimeInfo.isRequired).toBe(true);

		// ZodStringFormat - url (e.g. cover, image)
		const urlSchema = z.url().optional();
		const urlInfo = inspectSchema(urlSchema);
		expect(urlInfo.baseSchema).toBeInstanceOf(z.ZodStringFormat);

		// ZodString with constraints and transformations (e.g. summary, description, title)
		const stringSchema = z.string().trim().min(5).max(200).optional();
		const stringInfo = inspectSchema(stringSchema);
		expect(stringInfo.baseSchema).toBeInstanceOf(z.ZodString);
		expect(stringInfo.constraints).toEqual({ minLength: 5, maxLength: 200 });
		expect(stringInfo.isRequired).toBe(false);

		// ZodNumber with constraints (e.g. aiContribution, amount, hierarchyLevel)
		const numberSchema = z.number().min(0).max(1).default(0);
		const numberInfo = inspectSchema(numberSchema);
		expect(numberInfo.baseSchema).toBeInstanceOf(z.ZodNumber);
		expect(numberInfo.constraints).toEqual({ min: 0, max: 1 });
		expect(numberInfo.isRequired).toBe(true);

		// ZodLiteral (e.g. payload type literal)
		const literalSchema = z.literal('goal');
		const literalInfo = inspectSchema(literalSchema);
		expect(literalInfo.baseSchema).toBeInstanceOf(z.ZodLiteral);
		expect(literalInfo.isRequired).toBe(true);

		// ZodArray wrapping an inner base type
		const arrayEnumSchema = z.array(z.enum(['a', 'b'])).optional();
		const arrayInfo = inspectSchema(arrayEnumSchema);
		expect(arrayInfo.baseSchema).toBeInstanceOf(z.ZodEnum);

		// ZodReadonly wrapping a base type
		const readonlySchema = z.string().readonly();
		const readonlyInfo = inspectSchema(readonlySchema);
		expect(readonlyInfo.baseSchema).toBeInstanceOf(z.ZodString);
		expect(readonlyInfo.isReadonly).toBe(true);
		expect(readonlyInfo.isRequired).toBe(true);
	});
});
