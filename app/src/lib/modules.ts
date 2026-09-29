import { type PayloadType, payloadTypes } from '$lib/models';

// The module an object belongs to, which determines the accent color of its
// badges via the classes .module-* in app.css.
export const moduleByType = new Map<PayloadType, string>([
	[payloadTypes.enum.binary_indicator, 'impact-measurement'],
	[payloadTypes.enum.category, 'organizing'],
	[payloadTypes.enum.effect, 'impact-measurement'],
	[payloadTypes.enum.goal, 'goal-setting'],
	[payloadTypes.enum.help, 'knowledge-transfer'],
	[payloadTypes.enum.indicator_template, 'impact-measurement'],
	[payloadTypes.enum.knowledge, 'knowledge-transfer'],
	[payloadTypes.enum.measure, 'implementation-planning'],
	[payloadTypes.enum.objective, 'impact-measurement'],
	[payloadTypes.enum.page, 'organizing'],
	[payloadTypes.enum.program, 'goal-setting'],
	[payloadTypes.enum.report, 'impact-measurement'],
	[payloadTypes.enum.resource, 'resource-planning'],
	[payloadTypes.enum.resource_data, 'resource-planning'],
	[payloadTypes.enum.resource_v2, 'resource-planning'],
	[payloadTypes.enum.rule, 'rules'],
	[payloadTypes.enum.simple_measure, 'implementation-planning'],
	[payloadTypes.enum.task, 'implementation-planning'],
	[payloadTypes.enum.term, 'organizing']
]);
