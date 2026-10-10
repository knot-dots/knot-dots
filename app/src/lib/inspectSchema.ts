import { z, type ZodType } from 'zod';
import {
	$ZodCheckGreaterThan as ZodCheckGreaterThan,
	$ZodCheckLessThan as ZodCheckLessThan,
	$ZodCheckMaxLength as ZodCheckMaxLength,
	$ZodCheckMinLength as ZodCheckMinLength,
	$ZodCheckRegex as ZodCheckRegex
} from 'zod/v4/core';

export interface NumberConstraints {
	max?: number;
	min?: number;
}

export interface TextConstraints {
	maxLength?: number;
	minLength?: number;
	pattern?: string;
}

export function inspectSchema(schema: ZodType) {
	let current = schema;

	let constraints: NumberConstraints | TextConstraints | undefined = undefined;
	let isReadonly = false;
	let isRequired = true;

	while (current) {
		if (current instanceof z.ZodPipe) {
			current =
				current.def.in instanceof z.ZodPipe || current.def.out instanceof z.ZodTransform
					? (current.def.in as ZodType)
					: (current.def.out as ZodType);
			continue;
		}

		if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
			isRequired = false;
			current = current.unwrap() as ZodType;
			continue;
		}

		if (current instanceof z.ZodDefault) {
			current = current.unwrap() as ZodType;
			continue;
		}

		if (current instanceof z.ZodArray) {
			current = current.element as ZodType;
			continue;
		}

		if (current instanceof z.ZodReadonly) {
			isReadonly = true;
			current = current.unwrap() as ZodType;
			continue;
		}

		if (current instanceof z.ZodNumber) {
			const mappableChecks =
				current.def.checks?.filter((check): check is ZodCheckGreaterThan | ZodCheckLessThan =>
					[ZodCheckGreaterThan, ZodCheckLessThan].some((c) => check instanceof c)
				) ?? [];

			constraints = Object.fromEntries(
				mappableChecks.map((check) =>
					check instanceof ZodCheckGreaterThan
						? ['min', check._zod.def.value]
						: ['max', check._zod.def.value]
				)
			);
		}

		if (current instanceof z.ZodString) {
			const mappableChecks =
				current.def.checks?.filter(
					(check): check is ZodCheckMaxLength | ZodCheckMinLength | ZodCheckRegex =>
						[ZodCheckMaxLength, ZodCheckMinLength].some((c) => check instanceof c)
				) ?? [];

			constraints = Object.fromEntries(
				mappableChecks.map((check) =>
					check instanceof ZodCheckMaxLength
						? ['maxLength', check._zod.def.maximum]
						: check instanceof ZodCheckMinLength
							? ['minLength', check._zod.def.minimum]
							: ['pattern', check._zod.def.pattern]
				)
			) as TextConstraints;
		}

		break;
	}

	return {
		baseSchema: current,
		constraints,
		isReadonly,
		isRequired
	};
}
