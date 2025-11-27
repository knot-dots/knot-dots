import type { Component } from 'svelte';
import type { SvelteHTMLElements, SVGAttributes } from 'svelte/elements';
import ArrowSortLetters from '~icons/flowbite/arrow-sort-letters-outline';
import BadgeCheck from '~icons/flowbite/badge-check-solid';
import CheckCircle from '~icons/flowbite/check-circle-outline';
import Clock from '~icons/flowbite/clock-outline';
import Flag from '~icons/flowbite/flag-outline';
import Lightbulb from '~icons/flowbite/lightbulb-solid';
import Pen from '~icons/flowbite/pen-solid';
import ThumbsDown from '~icons/flowbite/thumbs-down-solid';
import ArrowTrendingUp from '~icons/heroicons/arrow-trending-up-solid';
import Bars2 from '~icons/heroicons/bars-2-solid';
import ChartPie from '~icons/heroicons/chart-pie';
import ChevronDoubleUp from '~icons/heroicons/chevron-double-up-solid';
import ChevronDoubleRight from '~icons/heroicons/chevron-double-right-solid';
import Minus from '~icons/heroicons/minus-solid';
import Square2Stack from '~icons/heroicons/square-2-stack';
import Cog from '~icons/knotdots/cog';
import Plus from '~icons/knotdots/plus';
import sdg01 from '$lib/assets/sdg/sdg-01.svg';
import sdg02 from '$lib/assets/sdg/sdg-02.svg';
import sdg03 from '$lib/assets/sdg/sdg-03.svg';
import sdg04 from '$lib/assets/sdg/sdg-04.svg';
import sdg05 from '$lib/assets/sdg/sdg-05.svg';
import sdg06 from '$lib/assets/sdg/sdg-06.svg';
import sdg07 from '$lib/assets/sdg/sdg-07.svg';
import sdg08 from '$lib/assets/sdg/sdg-08.svg';
import sdg09 from '$lib/assets/sdg/sdg-09.svg';
import sdg10 from '$lib/assets/sdg/sdg-10.svg';
import sdg11 from '$lib/assets/sdg/sdg-11.svg';
import sdg12 from '$lib/assets/sdg/sdg-12.svg';
import sdg13 from '$lib/assets/sdg/sdg-13.svg';
import sdg14 from '$lib/assets/sdg/sdg-14.svg';
import sdg15 from '$lib/assets/sdg/sdg-15.svg';
import sdg16 from '$lib/assets/sdg/sdg-16.svg';
import sdg17 from '$lib/assets/sdg/sdg-17.svg';
import {
	goalStatus,
	type GoalStatus,
	predicates,
	type ProgramStatus,
	programStatus,
	type RuleStatus,
	ruleStatus,
	type Status,
	status,
	type SustainableDevelopmentGoal,
	sustainableDevelopmentGoals,
	type TaskStatus,
	taskStatus,
	type BackgroundColor,
	backgroundColor
} from '$lib/models';

export const predicateIcons = new Map<string, Component<SVGAttributes<SVGSVGElement>>>([
	[predicates.enum['contributes-to'], ChartPie],
	[predicates.enum['is-affected-by'], ArrowTrendingUp],
	[predicates.enum['is-concrete-target-of'], ChartPie],
	[predicates.enum['is-consistent-with'], Plus],
	[predicates.enum['is-duplicate-of'], Square2Stack],
	[predicates.enum['is-equivalent-to'], Bars2],
	[predicates.enum['is-inconsistent-with'], Minus],
	[predicates.enum['is-prerequisite-for'], ChevronDoubleRight],
	[predicates.enum['is-sub-target-of'], ChartPie],
	[predicates.enum['is-superordinate-of'], ChevronDoubleUp]
]);

export const sdgIcons = new Map<SustainableDevelopmentGoal, string>([
	[sustainableDevelopmentGoals.enum['sdg.01'], sdg01],
	[sustainableDevelopmentGoals.enum['sdg.02'], sdg02],
	[sustainableDevelopmentGoals.enum['sdg.03'], sdg03],
	[sustainableDevelopmentGoals.enum['sdg.04'], sdg04],
	[sustainableDevelopmentGoals.enum['sdg.05'], sdg05],
	[sustainableDevelopmentGoals.enum['sdg.06'], sdg06],
	[sustainableDevelopmentGoals.enum['sdg.07'], sdg07],
	[sustainableDevelopmentGoals.enum['sdg.08'], sdg08],
	[sustainableDevelopmentGoals.enum['sdg.09'], sdg09],
	[sustainableDevelopmentGoals.enum['sdg.10'], sdg10],
	[sustainableDevelopmentGoals.enum['sdg.11'], sdg11],
	[sustainableDevelopmentGoals.enum['sdg.12'], sdg12],
	[sustainableDevelopmentGoals.enum['sdg.13'], sdg13],
	[sustainableDevelopmentGoals.enum['sdg.14'], sdg14],
	[sustainableDevelopmentGoals.enum['sdg.15'], sdg15],
	[sustainableDevelopmentGoals.enum['sdg.16'], sdg16],
	[sustainableDevelopmentGoals.enum['sdg.17'], sdg17]
]);

export const sortIcons = new Map<string, Component<SVGAttributes<SVGSVGElement>>>([
	['alpha', ArrowSortLetters],
	['modified', Clock]
]);

export const statusColors = new Map<Status, string>([
	[status.enum['status.idea'], 'pink'],
	[status.enum['status.in_planning'], 'orange'],
	[status.enum['status.adopted'], 'yellow'],
	[status.enum['status.in_implementation'], 'amber'],
	[status.enum['status.in_operation'], 'teal'],
	[status.enum['status.done'], 'green'],
	[status.enum['status.rejected'], 'indigo']
]);


export const backgroundColors = new Map<BackgroundColor, string>([
	[backgroundColor.enum['color.white'], 'white'],
	[backgroundColor.enum['color.blue'], 'blue'],
	[backgroundColor.enum['color.gray'], 'gray'],
	[backgroundColor.enum['color.red'], 'red'],
	[backgroundColor.enum['color.orange'], 'orange'],
	[backgroundColor.enum['color.yellow'], 'yellow']
]);

export const statusBackgrounds = new Map<Status, string>([
	[status.enum['status.idea'], 'var(--color-background-idea)'],
	[
		status.enum['status.in_planning'],
		'var(--gradient-after-idea), var(--color-background-in-planning)'
	],
	[
		status.enum['status.adopted'],
		'var(--gradient-after-in-planning), var(--color-background-adopted)'
	],
	[
		status.enum['status.in_implementation'],
		'var(--gradient-after-adopted), var(--color-background-in-implementation)'
	],
	[
		status.enum['status.in_operation'],
		'var(--gradient-after-in-implementation), var(--color-background-in-operation)'
	],
	[status.enum['status.done'], 'var(--gradient-after-in-operation), var(--color-background-done)'],
	[status.enum['status.rejected'], 'var(--gradient-after-done), var(--color-background-rejected)']
]);

export const statusHoverColors = new Map<Status, string>([
	[status.enum['status.idea'], 'var(--color-hover-idea)'],
	[status.enum['status.in_planning'], 'var(--color-hover-in-planning)'],
	[status.enum['status.adopted'], 'var(--color-hover-adopted)'],
	[status.enum['status.in_implementation'], 'var(--color-hover-in-implementation)'],
	[status.enum['status.in_operation'], 'var(--color-hover-in-operation)'],
	[status.enum['status.done'], 'var(--color-hover-done)'],
	[status.enum['status.rejected'], 'var(--color-hover-rejected)']
]);

export const statusIcons = new Map<Status, Component<SvelteHTMLElements['svg']>>([
	[status.enum['status.idea'], Lightbulb],
	[status.enum['status.in_planning'], Pen],
	[status.enum['status.in_implementation'], Cog],
	[status.enum['status.adopted'], CheckCircle],
	[status.enum['status.in_operation'], Flag],
	[status.enum['status.done'], BadgeCheck],
	[status.enum['status.rejected'], ThumbsDown]
]);

export const taskStatusColors = new Map<TaskStatus, string>([
	[taskStatus.enum['task_status.idea'], 'pink'],
	[taskStatus.enum['task_status.in_planning'], 'orange'],
	[taskStatus.enum['task_status.in_progress'], 'amber'],
	[taskStatus.enum['task_status.done'], 'green'],
	[taskStatus.enum['task_status.rejected'], 'indigo']
]);

export const taskStatusBackgrounds = new Map<TaskStatus, string>([
	[taskStatus.enum['task_status.idea'], 'var(--color-background-idea)'],
	[
		taskStatus.enum['task_status.in_planning'],
		'var(--gradient-after-idea), var(--color-background-in-planning)'
	],
	[
		taskStatus.enum['task_status.in_progress'],
		'var(--gradient-after-in-planning), var(--color-background-in-implementation)'
	],
	[
		taskStatus.enum['task_status.done'],
		'var(--gradient-after-in-implementation), var(--color-background-done)'
	],
	[
		taskStatus.enum['task_status.rejected'],
		'var(--gradient-after-done), var(--color-background-rejected)'
	]
]);

export const taskStatusHoverColors = new Map<TaskStatus, string>([
	[taskStatus.enum['task_status.idea'], 'var(--color-hover-idea)'],
	[taskStatus.enum['task_status.in_planning'], 'var(--color-hover-in-planning)'],
	[taskStatus.enum['task_status.in_progress'], 'var(--color-hover-in-implementation)'],
	[taskStatus.enum['task_status.done'], 'var(--color-hover-done)'],
	[taskStatus.enum['task_status.rejected'], 'var(--color-hover-rejected)']
]);

export const taskStatusIcons = new Map<TaskStatus, Component<SvelteHTMLElements['svg']>>([
	[taskStatus.enum['task_status.idea'], Lightbulb],
	[taskStatus.enum['task_status.in_planning'], Pen],
	[taskStatus.enum['task_status.in_progress'], Cog],
	[taskStatus.enum['task_status.done'], Flag],
	[taskStatus.enum['task_status.rejected'], ThumbsDown]
]);

export const ruleStatusColors = new Map<RuleStatus, string>([
	[ruleStatus.enum['rule_status.idea'], 'pink'],
	[ruleStatus.enum['rule_status.in_planning'], 'orange'],
	[ruleStatus.enum['rule_status.adopted'], 'yellow'],
	[ruleStatus.enum['rule_status.rejected'], 'indigo']
]);

export const ruleStatusBackgrounds = new Map<RuleStatus, string>([
	[ruleStatus.enum['rule_status.idea'], 'var(--color-background-idea)'],
	[
		ruleStatus.enum['rule_status.in_planning'],
		'var(--gradient-after-idea), var(--color-background-in-planning)'
	],
	[
		ruleStatus.enum['rule_status.adopted'],
		'var(--gradient-after-in-planning), var(--color-background-adopted)'
	],
	[
		ruleStatus.enum['rule_status.rejected'],
		'var(--gradient-after-adopted), var(--color-background-rejected)'
	]
]);

export const ruleStatusHoverColors = new Map<RuleStatus, string>([
	[ruleStatus.enum['rule_status.idea'], 'var(--color-hover-idea)'],
	[ruleStatus.enum['rule_status.in_planning'], 'var(--color-hover-in-planning)'],
	[ruleStatus.enum['rule_status.adopted'], 'var(--color-hover-done)'],
	[ruleStatus.enum['rule_status.rejected'], 'var(--color-hover-rejected)']
]);

export const ruleStatusIcons = new Map<RuleStatus, Component<SvelteHTMLElements['svg']>>([
	[ruleStatus.enum['rule_status.idea'], Lightbulb],
	[ruleStatus.enum['rule_status.in_planning'], Pen],
	[ruleStatus.enum['rule_status.adopted'], CheckCircle],
	[ruleStatus.enum['rule_status.rejected'], ThumbsDown]
]);

export const goalStatusColors = new Map<GoalStatus, string>([
	[goalStatus.enum['goal_status.idea'], 'pink'],
	[goalStatus.enum['goal_status.in_planning'], 'orange'],
	[goalStatus.enum['goal_status.adopted'], 'yellow'],
	[goalStatus.enum['goal_status.achieved'], 'green'],
	[goalStatus.enum['goal_status.rejected'], 'indigo']
]);

export const goalStatusBackgrounds = new Map<GoalStatus, string>([
	[goalStatus.enum['goal_status.idea'], 'var(--color-background-idea)'],
	[
		goalStatus.enum['goal_status.in_planning'],
		'var(--gradient-after-idea), var(--color-background-in-planning)'
	],
	[
		goalStatus.enum['goal_status.adopted'],
		'var(--gradient-after-in-planning), var(--color-background-adopted)'
	],
	[
		goalStatus.enum['goal_status.achieved'],
		'var(--gradient-after-adopted), var(--color-background-done)'
	],
	[
		goalStatus.enum['goal_status.rejected'],
		'var(--gradient-after-done), var(--color-background-rejected)'
	]
]);

export const goalStatusHoverColors = new Map<GoalStatus, string>([
	[goalStatus.enum['goal_status.idea'], 'var(--color-hover-idea)'],
	[goalStatus.enum['goal_status.in_planning'], 'var(--color-hover-in-planning)'],
	[goalStatus.enum['goal_status.adopted'], 'var(--color-hover-adopted)'],
	[goalStatus.enum['goal_status.achieved'], 'var(--color-hover-done)'],
	[goalStatus.enum['goal_status.rejected'], 'var(--color-hover-rejected)']
]);

export const goalStatusIcons = new Map<GoalStatus, Component<SvelteHTMLElements['svg']>>([
	[goalStatus.enum['goal_status.idea'], Lightbulb],
	[goalStatus.enum['goal_status.in_planning'], Pen],
	[goalStatus.enum['goal_status.adopted'], CheckCircle],
	[goalStatus.enum['goal_status.achieved'], BadgeCheck],
	[goalStatus.enum['goal_status.rejected'], ThumbsDown]
]);

export const programStatusColors = new Map<ProgramStatus, string>([
	[programStatus.enum['program_status.idea'], 'pink'],
	[programStatus.enum['program_status.in_planning'], 'orange'],
	[programStatus.enum['program_status.adopted'], 'yellow'],
	[programStatus.enum['program_status.in_implementation'], 'amber'],
	[programStatus.enum['program_status.done'], 'green'],
	[programStatus.enum['program_status.rejected'], 'indigo']
]);

export const programStatusBackgrounds = new Map<ProgramStatus, string>([
	[programStatus.enum['program_status.idea'], 'var(--color-background-idea)'],
	[
		programStatus.enum['program_status.in_planning'],
		'var(--gradient-after-idea), var(--color-background-in-planning)'
	],
	[
		programStatus.enum['program_status.adopted'],
		'var(--gradient-after-in-planning), var(--color-background-adopted)'
	],
	[
		programStatus.enum['program_status.in_implementation'],
		'var(--gradient-after-adopted), var(--color-background-in-implementation)'
	],
	[
		programStatus.enum['program_status.done'],
		'var(--gradient-after-in-implementation), var(--color-background-done)'
	],
	[
		programStatus.enum['program_status.rejected'],
		'var(--gradient-after-done), var(--color-background-rejected)'
	]
]);

export const programStatusHoverColors = new Map<ProgramStatus, string>([
	[programStatus.enum['program_status.idea'], 'var(--color-hover-idea)'],
	[programStatus.enum['program_status.in_planning'], 'var(--color-hover-in-planning)'],
	[programStatus.enum['program_status.adopted'], 'var(--color-hover-adopted)'],
	[programStatus.enum['program_status.in_implementation'], 'var(--color-hover-in-implementation)'],
	[programStatus.enum['program_status.done'], 'var(--color-hover-done)'],
	[programStatus.enum['program_status.rejected'], 'var(--color-hover-rejected)']
]);

export const programStatusIcons = new Map<ProgramStatus, Component<SvelteHTMLElements['svg']>>([
	[programStatus.enum['program_status.idea'], Lightbulb],
	[programStatus.enum['program_status.in_planning'], Pen],
	[programStatus.enum['program_status.adopted'], CheckCircle],
	[programStatus.enum['program_status.in_implementation'], Cog],
	[programStatus.enum['program_status.done'], BadgeCheck],
	[programStatus.enum['program_status.rejected'], ThumbsDown]
]);
