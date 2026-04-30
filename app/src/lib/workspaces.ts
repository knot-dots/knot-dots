import type { Component } from 'svelte';
import type { SvelteHTMLElements } from 'svelte/elements';
import ChartBar from '~icons/knotdots/chart-bar';
import ChartMixed from '~icons/knotdots/chart-mixed';
import Chapter from '~icons/knotdots/chapter';
import Clipboard from '~icons/knotdots/clipboard-simple';
import ClipboardCheck from '~icons/knotdots/clipboard-check';
import Collection from '~icons/knotdots/collection';
import Compass from '~icons/knotdots/compass';
import Gavel from '~icons/knotdots/gavel';
import Goal from '~icons/knotdots/goal';
import Help from '~icons/knotdots/help';
import LandingPage from '~icons/knotdots/landing-page';
import Objects from '~icons/knotdots/objects';
import Program from '~icons/knotdots/program';
import Resources from '~icons/knotdots/resources_v2';
import Tag from '~icons/knotdots/tag';
import { boards, type OrganizationContainer, type OrganizationalUnitContainer } from '$lib/models';
import type { createFeatureDecisions } from '$lib/features';

export type WorkspaceModuleKey =
	| 'goals_planning'
	| 'implementation_planning'
	| 'effect_measurement'
	| 'resource_planning'
	| 'knowledge_transfer'
	| 'rules'
	| 'organizing';

export interface WorkspaceModule {
	key: WorkspaceModuleKey;
	i18nKey: string;
	colorClass: string;
}

export const workspaceModules: WorkspaceModule[] = [
	{
		key: 'goals_planning',
		i18nKey: 'workspace.module.goals_planning',
		colorClass: 'menu-segment--goals'
	},
	{
		key: 'implementation_planning',
		i18nKey: 'workspace.module.implementation_planning',
		colorClass: 'menu-segment--implementation'
	},
	{
		key: 'effect_measurement',
		i18nKey: 'workspace.module.effect_measurement',
		colorClass: 'menu-segment--effects'
	},
	{
		key: 'resource_planning',
		i18nKey: 'workspace.module.resource_planning',
		colorClass: 'menu-segment--resources'
	},
	{
		key: 'knowledge_transfer',
		i18nKey: 'workspace.module.knowledge_transfer',
		colorClass: 'menu-segment--knowledge'
	},
	{
		key: 'rules',
		i18nKey: 'workspace.module.rules',
		colorClass: 'menu-segment--rules'
	},
	{
		key: 'organizing',
		i18nKey: 'workspace.module.organizing',
		colorClass: 'menu-segment--organize'
	}
];

export type WorkspaceFeatureDecisions = ReturnType<typeof createFeatureDecisions>;

export type WorkspaceFeatureFlag = keyof {
	[K in keyof WorkspaceFeatureDecisions as WorkspaceFeatureDecisions[K] extends () => boolean
		? K
		: never]: true;
};

export type WorkspaceBoardFlag = (typeof boards.options)[number];

export type WorkspaceViewKey = 'page' | 'catalog' | 'level' | 'status' | 'table' | 'monitoring';

export interface WorkspaceDefinition {
	key: string;
	i18nKey: string;
	helperI18nKey: string;
	icon: Component<SvelteHTMLElements['svg']>;
	module: WorkspaceModuleKey;
	/** Map view → URL path (without context segment). The `default` view is the entry view. */
	views: Partial<Record<WorkspaceViewKey, string>> & { default: string };
	featureFlag?: WorkspaceFeatureFlag;
	boardFlag?: WorkspaceBoardFlag;
	/** Always shown regardless of `visibleWorkspaces` configuration. */
	alwaysVisible?: boolean;
}

export const strategyProgramTypes = [
	'program_type.strategy',
	'program_type.mobility',
	'program_type.sustainability',
	'program_type.smart_city',
	'program_type.isek',
	'program_type.agenda'
] as const;

export const workspaces: WorkspaceDefinition[] = [
	// Goals planning
	{
		key: 'strategies',
		i18nKey: 'workspace.type.strategies',
		helperI18nKey: 'workspace.helper.strategies',
		icon: Compass,
		module: 'goals_planning',
		views: {
			default: '/strategies/catalog',
			catalog: '/strategies/catalog',
			level: '/strategies/level',
			status: '/strategies/status',
			table: '/strategies/table'
		}
	},
	{
		key: 'goals',
		i18nKey: 'workspace.type.goals',
		helperI18nKey: 'workspace.helper.goals',
		icon: Goal,
		module: 'goals_planning',
		views: {
			default: '/goals/level',
			catalog: '/goals/catalog',
			level: '/goals/level',
			status: '/goals/status',
			table: '/goals/table'
		}
	},
	{
		key: 'federal-levels',
		i18nKey: 'workspace.type.federal_levels',
		helperI18nKey: 'workspace.helper.federal_levels',
		icon: Program,
		module: 'goals_planning',
		views: {
			default: '/programs/level',
			level: '/programs/level'
		}
	},
	// Implementation planning
	{
		key: 'measures',
		i18nKey: 'workspace.type.measures',
		helperI18nKey: 'workspace.helper.measures',
		icon: Clipboard,
		module: 'implementation_planning',
		views: {
			default: '/measures/status',
			catalog: '/measures/catalog',
			status: '/measures/status',
			table: '/measures/table'
		}
	},
	{
		key: 'measure-monitoring',
		i18nKey: 'workspace.type.measure_monitoring',
		helperI18nKey: 'workspace.helper.measure_monitoring',
		icon: ChartBar,
		module: 'implementation_planning',
		views: {
			default: '/measures/monitoring',
			monitoring: '/measures/monitoring'
		}
	},
	{
		key: 'tasks',
		i18nKey: 'workspace.type.tasks',
		helperI18nKey: 'workspace.helper.tasks',
		icon: ClipboardCheck,
		module: 'implementation_planning',
		views: {
			default: '/tasks/status',
			catalog: '/tasks/catalog',
			status: '/tasks/status',
			table: '/tasks/table'
		}
	},
	// Effect measurement
	{
		key: 'indicators',
		i18nKey: 'workspace.type.indicators',
		helperI18nKey: 'workspace.helper.indicators',
		icon: ChartBar,
		module: 'effect_measurement',
		views: {
			default: '/indicators/catalog',
			catalog: '/indicators/catalog',
			table: '/indicators/table'
		},
		boardFlag: 'board.indicators'
	},
	{
		key: 'reports',
		i18nKey: 'workspace.type.reports',
		helperI18nKey: 'workspace.helper.reports',
		icon: Chapter,
		module: 'effect_measurement',
		views: {
			default: '/reports/catalog',
			catalog: '/reports/catalog'
		},
		featureFlag: 'useReport'
	},
	{
		key: 'objectives-and-effects',
		i18nKey: 'workspace.type.objectives_and_effects',
		helperI18nKey: 'workspace.helper.objectives_and_effects',
		icon: ChartMixed,
		module: 'effect_measurement',
		views: {
			default: '/objectives-and-effects',
			level: '/objectives-and-effects'
		},
		boardFlag: 'board.indicators'
	},
	// Resource planning
	{
		key: 'resources',
		i18nKey: 'workspace.type.resources',
		helperI18nKey: 'workspace.helper.resources',
		icon: Resources,
		module: 'resource_planning',
		views: {
			default: '/resources/catalog',
			catalog: '/resources/catalog',
			table: '/resources/table'
		},
		featureFlag: 'useResourceWorkspace'
	},
	// Knowledge transfer
	{
		key: 'guides',
		i18nKey: 'workspace.type.guides',
		helperI18nKey: 'workspace.helper.guides',
		icon: Help,
		module: 'knowledge_transfer',
		views: {
			default: '/guides/catalog',
			catalog: '/guides/catalog',
			table: '/guides/table'
		}
	},
	{
		key: 'knowledge',
		i18nKey: 'workspace.type.knowledge',
		helperI18nKey: 'workspace.helper.knowledge',
		icon: Compass,
		module: 'knowledge_transfer',
		views: {
			default: '/knowledge/level',
			catalog: '/knowledge/catalog',
			level: '/knowledge/level',
			table: '/knowledge/table'
		}
	},
	// Rules
	{
		key: 'set-of-rules',
		i18nKey: 'workspace.type.set_of_rules',
		helperI18nKey: 'workspace.helper.set_of_rules',
		icon: Gavel,
		module: 'rules',
		views: {
			default: '/set-of-rules/catalog',
			catalog: '/set-of-rules/catalog',
			status: '/set-of-rules/status',
			table: '/set-of-rules/table'
		}
	},
	{
		key: 'rules',
		i18nKey: 'workspace.type.rules',
		helperI18nKey: 'workspace.helper.rules',
		icon: Gavel,
		module: 'rules',
		views: {
			default: '/rules/catalog',
			catalog: '/rules/catalog'
		}
	},
	// Organizing (always visible)
	{
		key: 'pages',
		i18nKey: 'workspace.type.pages',
		helperI18nKey: 'workspace.helper.pages',
		icon: LandingPage,
		module: 'organizing',
		views: {
			default: '/pages/catalog',
			catalog: '/pages/catalog'
		},
		featureFlag: 'usePage',
		alwaysVisible: true
	},
	{
		key: 'templates',
		i18nKey: 'workspace.type.templates',
		helperI18nKey: 'workspace.helper.templates',
		icon: Collection,
		module: 'organizing',
		views: {
			default: '/templates',
			catalog: '/templates'
		},
		alwaysVisible: true
	},
	{
		key: 'categories',
		i18nKey: 'workspace.type.categories',
		helperI18nKey: 'workspace.helper.categories',
		icon: Tag,
		module: 'organizing',
		views: {
			default: '/categories',
			level: '/categories'
		},
		featureFlag: 'useCustomCategories',
		alwaysVisible: true
	},
	{
		key: 'overview',
		i18nKey: 'workspace.type.overview',
		helperI18nKey: 'workspace.helper.overview',
		icon: Objects,
		module: 'organizing',
		views: {
			default: '/all/catalog',
			catalog: '/all/catalog',
			level: '/all/level',
			page: '/all/page',
			table: '/all/table'
		},
		alwaysVisible: true
	}
];

export const workspaceByKey: Record<string, WorkspaceDefinition> = Object.fromEntries(
	workspaces.map((w) => [w.key, w])
);

interface VisibilityContext {
	organization: OrganizationContainer;
	organizationalUnit?: OrganizationalUnitContainer | null;
	features: WorkspaceFeatureDecisions;
	/** Returns true if the user is allowed to see / create the given workspace key. */
	hasPermission?: (workspaceKey: string) => boolean;
}

/**
 * Returns the workspaces that should be shown for the given organization context.
 *
 * Visibility rules:
 * - `alwaysVisible` workspaces are always shown (subject to feature flag).
 * - Workspaces with a `featureFlag` are hidden when the flag is off.
 * - Workspaces with a `boardFlag` are hidden when the board is not enabled
 *   on the organization or organizational unit.
 * - When the organizational unit has a non-empty `visibleWorkspaces`, it takes
 *   precedence over the organization's setting (suborg admins can override).
 * - Otherwise the organization's `visibleWorkspaces` applies; when also empty,
 *   all remaining workspaces are visible (default without explicit choice).
 * - When `visibleWorkspaces` is populated, only the listed workspace keys are
 *   visible (in addition to `alwaysVisible`).
 * - `hasPermission` provides an extra hook for permission-based filtering
 *   (e.g. categories require `mayCreateContainer` permission).
 */
export function getVisibleWorkspaces(ctx: VisibilityContext): WorkspaceDefinition[] {
	const { organization, organizationalUnit, features, hasPermission } = ctx;
	const selectedContext = organizationalUnit ?? organization;
	const enabledBoards = new Set(selectedContext.payload.boards);
	const orgUnitExplicit = organizationalUnit?.payload.visibleWorkspaces ?? [];
	const explicit =
		orgUnitExplicit.length > 0 ? orgUnitExplicit : (organization.payload.visibleWorkspaces ?? []);
	const explicitSet = new Set(explicit);

	return workspaces.filter((workspace) => {
		if (workspace.featureFlag && !features[workspace.featureFlag]()) {
			return false;
		}
		if (workspace.boardFlag && !enabledBoards.has(workspace.boardFlag)) {
			return false;
		}
		if (hasPermission && !hasPermission(workspace.key)) {
			return false;
		}
		if (workspace.alwaysVisible) {
			return true;
		}
		if (explicitSet.size === 0) {
			return true;
		}
		return explicitSet.has(workspace.key);
	});
}

/**
 * Returns the workspaces grouped by module, preserving module order from
 * `workspaceModules`. Empty modules are omitted.
 */
export function groupWorkspacesByModule(
	visible: WorkspaceDefinition[]
): Array<{ module: WorkspaceModule; workspaces: WorkspaceDefinition[] }> {
	const byModule = new Map<WorkspaceModuleKey, WorkspaceDefinition[]>();
	for (const w of visible) {
		const list = byModule.get(w.module) ?? [];
		list.push(w);
		byModule.set(w.module, list);
	}
	return workspaceModules
		.filter((m) => byModule.has(m.key))
		.map((m) => ({ module: m, workspaces: byModule.get(m.key) ?? [] }));
}

/**
 * Identify the current workspace from a pathname (without org/orgUnit prefix).
 * E.g. `/strategies/catalog` → workspaces['strategies'].
 */
export function workspaceFromPathname(pathnameWithoutContext: string): WorkspaceDefinition | null {
	const segments = pathnameWithoutContext.split('/').filter(Boolean);
	if (segments.length === 0) return null;
	const slug = segments[0];

	// Direct slug match (e.g. /strategies/...)
	const direct = workspaces.find((w) => {
		const defaultPath = w.views.default;
		return defaultPath.split('/')[1] === slug;
	});
	// Prefer exact path match if multiple workspaces share a slug (e.g. measures vs measure-monitoring)
	const exact = workspaces.find((w) =>
		Object.values(w.views).some((path) => path === pathnameWithoutContext)
	);
	return exact ?? direct ?? null;
}
