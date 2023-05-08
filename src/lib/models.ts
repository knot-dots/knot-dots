import { z } from 'zod';

const sdgValues = [
	'sdg.01',
	'sdg.02',
	'sdg.03',
	'sdg.04',
	'sdg.05',
	'sdg.06',
	'sdg.07',
	'sdg.08',
	'sdg.09',
	'sdg.10',
	'sdg.11',
	'sdg.12',
	'sdg.13',
	'sdg.14',
	'sdg.15',
	'sdg.16',
	'sdg.17'
] as const;
export const sustainableDevelopmentGoals = z.enum(sdgValues);

export type SustainableDevelopmentGoal = z.infer<typeof sustainableDevelopmentGoals>;

export function isSustainableDevelopmentGoal(value: unknown): value is SustainableDevelopmentGoal {
	return sdgValues.includes(value as SustainableDevelopmentGoal);
}

const containerTypeValues = [
	'measure',
	'model',
	'operational_goal',
	'strategic_goal',
	'strategy'
] as const;

export const containerTypes = z.enum(containerTypeValues);

export type ContainerType = z.infer<typeof containerTypes>;

export function isContainerType(value: unknown): value is ContainerType {
	return containerTypeValues.includes(value as ContainerType);
}

const predicateValues = ['is-part-of'] as const;

export const predicates = z.enum(predicateValues);

export type Predicate = z.infer<typeof predicates>;

export function isPredicate(value: unknown): value is Predicate {
	return predicateValues.includes(value as Predicate);
}
