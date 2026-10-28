import type { Component } from 'svelte';
import type { SvelteHTMLElements, SVGAttributes } from 'svelte/elements';
import ArrowSortLetters from '~icons/flowbite/arrow-sort-letters-outline';
import CalendarMonth from '~icons/flowbite/calendar-month-outline';
import BadgeCheck from '~icons/flowbite/badge-check-solid';
import BookOpen from '~icons/flowbite/book-open-outline';
import Cash from '~icons/flowbite/cash-outline';
import Clock from '~icons/flowbite/clock-outline';
import Code from '~icons/flowbite/file-code-solid';
import File from '~icons/flowbite/file-solid';
import Flag from '~icons/flowbite/flag-outline';
import Lightbulb from '~icons/flowbite/lightbulb-solid';
import Newspaper from '~icons/flowbite/newspaper-outline';
import Pen from '~icons/flowbite/pen-solid';
import QuestionCircle from '~icons/flowbite/question-circle-outline';
import Quote from '~icons/flowbite/quote-solid';
import Tag from '~icons/flowbite/tag-outline';
import ThumbsDown from '~icons/flowbite/thumbs-down-solid';
import ArrowTrendingUp from '~icons/heroicons/arrow-trending-up-solid';
import Bars2 from '~icons/heroicons/bars-2-solid';
import ChartPie from '~icons/heroicons/chart-pie';
import ChevronDoubleUp from '~icons/heroicons/chevron-double-up-solid';
import ChevronDoubleRight from '~icons/heroicons/chevron-double-right-solid';
import Minus from '~icons/heroicons/minus-solid';
import Square2Stack from '~icons/heroicons/square-2-stack';
import BasicData from '~icons/knotdots/basic-data';
import Chapter from '~icons/knotdots/chapter';
import ChartLine from '~icons/knotdots/chart-line';
import ChartMixed from '~icons/knotdots/chart-mixed';
import ClipboardCheck from '~icons/knotdots/clipboard-check';
import ClipboardSimple from '~icons/knotdots/clipboard-simple';
import Cog from '~icons/knotdots/cog';
import Collection from '~icons/knotdots/collection';
import ExclamationCircle from '~icons/knotdots/exclamation-circle';
import Goal from '~icons/knotdots/goal';
import Grid from '~icons/knotdots/grid';
import Image from '~icons/knotdots/placeholder-image';
import LandingPage from '~icons/knotdots/landing-page';
import Link from '~icons/knotdots/link';
import MapIcon from '~icons/knotdots/map';
import Objectives from '~icons/knotdots/objectives';
import Organization from '~icons/knotdots/organization';
import OrganizationalUnit from '~icons/knotdots/organizational-unit';
import Plus from '~icons/knotdots/plus';
import Program from '~icons/knotdots/program';
import Progress from '~icons/knotdots/progress';
import Relation from '~icons/knotdots/relation';
import ResourcesV2 from '~icons/knotdots/resources_v2';
import RuleDatabase from '~icons/knotdots/rule-database';
import Star from '~icons/knotdots/star';
import Summary from '~icons/knotdots/summary';
import TargetCheckConflictingTargets from '~icons/knotdots/target-check-conflicting-targets';
import TargetCheckInsufficientData from '~icons/knotdots/target-check-insufficient-data';
import TargetCheckNoTarget from '~icons/knotdots/target-check-no-target';
import TargetCheckNoTrend from '~icons/knotdots/target-check-no-trend';
import TargetCheckOffTrack from '~icons/knotdots/target-check-off-track';
import TargetCheckOnTrack from '~icons/knotdots/target-check-on-track';
import Text from '~icons/knotdots/text';
import TwoCol from '~icons/knotdots/two-column';
import Video from '~icons/knotdots/video';
import {
	type Status,
	status,
	predicates,
	type BackgroundColor,
	backgroundColor,
	payloadTypes,
	type PayloadType
} from '$lib/models';
import { isAssessed, type ReviewStatus } from '$lib/reviewStatus';

export const payloadTypeIcons = new Map<PayloadType, Component<SVGAttributes<SVGSVGElement>>>([
	[payloadTypes.enum.administrative_area_basic_data, BasicData],
	[payloadTypes.enum.binary_indicator, ChartLine],
	[payloadTypes.enum.category, Tag],
	[payloadTypes.enum.chapter, Chapter],
	[payloadTypes.enum.col_content, TwoCol],
	[payloadTypes.enum.custom_collection, Grid],
	[payloadTypes.enum.demographic_data, BasicData],
	[payloadTypes.enum.effect, ChartMixed],
	[payloadTypes.enum.effect_collection, ChartMixed],
	[payloadTypes.enum.event, CalendarMonth],
	[payloadTypes.enum.file_collection, File],
	[payloadTypes.enum.goal, Goal],
	[payloadTypes.enum.goal_collection, Goal],
	[payloadTypes.enum.help, QuestionCircle],
	[payloadTypes.enum.html, Code],
	[payloadTypes.enum.ignite_video, Video],
	[payloadTypes.enum.image, Image],
	[payloadTypes.enum.indicator, ChartLine],
	[payloadTypes.enum.indicator_collection, ChartLine],
	[payloadTypes.enum.info_box, ExclamationCircle],
	[payloadTypes.enum.knowledge, BookOpen],
	[payloadTypes.enum.map, MapIcon],
	[payloadTypes.enum.measure, ClipboardSimple],
	[payloadTypes.enum.measure_collection, ClipboardSimple],
	[payloadTypes.enum.objective, Objectives],
	[payloadTypes.enum.objective_collection, Objectives],
	[payloadTypes.enum.organization, Organization],
	[payloadTypes.enum.organizational_unit, OrganizationalUnit],
	[payloadTypes.enum.page, LandingPage],
	[payloadTypes.enum.post, Newspaper],
	[payloadTypes.enum.program, Program],
	[payloadTypes.enum.program_collection, Program],
	[payloadTypes.enum.progress, Progress],
	[payloadTypes.enum.quote, Quote],
	[payloadTypes.enum.relation_collection, Relation],
	[payloadTypes.enum.report, Chapter],
	[payloadTypes.enum.resource, ResourcesV2],
	[payloadTypes.enum.resource_collection, ResourcesV2],
	[payloadTypes.enum.resource_v2, ResourcesV2],
	[payloadTypes.enum.resource_data, Cash],
	[payloadTypes.enum.resource_data_collection, Cash],
	[payloadTypes.enum.rule, RuleDatabase],
	[payloadTypes.enum.simple_measure, ClipboardSimple],
	[payloadTypes.enum.summary, Summary],
	[payloadTypes.enum.task, ClipboardCheck],
	[payloadTypes.enum.task_collection, ClipboardCheck],
	[payloadTypes.enum.term, Tag],
	[payloadTypes.enum.teaser, Link],
	[payloadTypes.enum.teaser_collection, Collection],
	[payloadTypes.enum.teaser_highlight, Star],
	[payloadTypes.enum.text, Text]
]);

export const predicateIcons = new Map<string, Component<SVGAttributes<SVGSVGElement>>>([
	[predicates.enum['contributes-to'], ChartPie],
	[predicates.enum['is-affected-by'], ArrowTrendingUp],
	[predicates.enum['is-concrete-target-of'], ChartPie],
	[predicates.enum['is-consistent-with'], Plus],
	[predicates.enum['is-duplicate-of'], Square2Stack],
	[predicates.enum['is-equivalent-to'], Bars2],
	[predicates.enum['implies'], ChevronDoubleRight],
	[predicates.enum['is-inconsistent-with'], Minus],
	[predicates.enum['is-prerequisite-for'], ChevronDoubleRight],
	[predicates.enum['is-sub-target-of'], ChartPie],
	[predicates.enum['is-superordinate-of'], ChevronDoubleUp]
]);

export const propertyIcons = new Map<string, Component<SVGAttributes<SVGSVGElement>>>([
	['date', CalendarMonth],
	['goal', Goal],
	['measure', ClipboardSimple],
	['program', Program],
	['task', ClipboardCheck]
]);

export const sortIcons = new Map<string, Component<SVGAttributes<SVGSVGElement>>>([
	['alpha', ArrowSortLetters],
	['date', CalendarMonth],
	['modified', Clock]
]);

export const statusColors = new Map<Status, string>([
	[status.enum['status.idea'], 'pink'],
	[status.enum['status.in_planning'], 'orange'],
	[status.enum['status.in_implementation'], 'amber'],
	[status.enum['status.in_operation'], 'teal'],
	[status.enum['status.done'], 'green'],
	[status.enum['status.rejected'], 'indigo']
]);

export const reviewStatusColors = new Map<ReviewStatus, string>([
	['review_status.in_target_direction', 'green'],
	['review_status.against_target_direction', 'red'],
	['review_status.no_clear_trend', 'yellow'],
	['review_status.diverging_targets', 'purple'],
	['review_status.no_target', 'gray'],
	['review_status.insufficient_data', 'gray'],
	['review_status.no_expectation', 'gray']
]);

// The background glow of an assessed item under review, in the color of its status
export function reviewStatusAuraColor(status: ReviewStatus) {
	if (!isAssessed(status)) {
		return undefined;
	}
	return `color-mix(in srgb, var(--color-${reviewStatusColors.get(status)}-600) 22%, transparent)`;
}

export const reviewStatusIcons = new Map<ReviewStatus, Component<SVGAttributes<SVGSVGElement>>>([
	['review_status.in_target_direction', TargetCheckOnTrack],
	['review_status.against_target_direction', TargetCheckOffTrack],
	['review_status.no_clear_trend', TargetCheckNoTrend],
	['review_status.diverging_targets', TargetCheckConflictingTargets],
	['review_status.no_target', TargetCheckNoTarget],
	['review_status.insufficient_data', TargetCheckInsufficientData],
	['review_status.no_expectation', TargetCheckInsufficientData]
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
		status.enum['status.in_implementation'],
		'var(--gradient-after-in-planning), var(--color-background-in-implementation)'
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
	[status.enum['status.in_implementation'], 'var(--color-hover-in-implementation)'],
	[status.enum['status.in_operation'], 'var(--color-hover-in-operation)'],
	[status.enum['status.done'], 'var(--color-hover-done)'],
	[status.enum['status.rejected'], 'var(--color-hover-rejected)']
]);

export const statusIcons = new Map<Status, Component<SvelteHTMLElements['svg']>>([
	[status.enum['status.idea'], Lightbulb],
	[status.enum['status.in_planning'], Pen],
	[status.enum['status.in_implementation'], Cog],
	[status.enum['status.in_operation'], Flag],
	[status.enum['status.done'], BadgeCheck],
	[status.enum['status.rejected'], ThumbsDown]
]);
