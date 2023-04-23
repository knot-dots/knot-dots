import { z } from 'zod';

const containerTypeValues = [
	'measure',
	'model',
	'operational_goal',
	'strategic_goal',
	'strategy',
	'topic'
] as const;

export const containerTypes = z.enum(containerTypeValues);

export type ContainerType = z.infer<typeof containerTypes>;

export function isContainerType(value: unknown): value is ContainerType {
	return containerTypeValues.includes(value as ContainerType);
}
