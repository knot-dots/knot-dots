import type { Component } from 'svelte';
import type { SvelteHTMLElements } from 'svelte/elements';
import ChartBar from '~icons/knotdots/chart-bar';
import ChartLine from '~icons/knotdots/chart-line';
import ChartMixed from '~icons/knotdots/chart-mixed';
import BookOutline from '~icons/knotdots/book-outline';
import BookOpenOutline from '~icons/knotdots/book-open-outline';
import Chapter from '~icons/knotdots/chapter';
import Clipboard from '~icons/knotdots/clipboard-simple';
import ClipboardCheck from '~icons/knotdots/clipboard-check';
import Compass from '~icons/knotdots/compass';
import Gavel from '~icons/knotdots/gavel';
import Help from '~icons/knotdots/help';
import Goal from '~icons/knotdots/goal';
import LandingPage from '~icons/knotdots/landing-page';
import Objects from '~icons/knotdots/objects';
import Program from '~icons/knotdots/program';
import Resources from '~icons/knotdots/resources_v2';
import RuleDatabase from '~icons/knotdots/rule-database';
import Tag from '~icons/knotdots/tag';
import Users from '~icons/knotdots/users';
import Template from '~icons/knotdots/template';
import {
	boards,
	containerOfType,
	isOrganizationContainer,
	payloadTypes,
	type OrganizationContainer,
	type OrganizationalUnitContainer
} from '$lib/models';
import type { createFeatureDecisions } from '$lib/features';
import type { MongoAbility } from '@casl/ability';
import type { User } from '$lib/stores';

export type WorkspaceModuleKey =
	| 'goal_setting'
	| 'implementation_planning'
	| 'impact_measurement'
	| 'resource_planning'
	| 'knowledge_transfer'
	| 'rules'
	| 'organizing';

export interface WorkspaceModule {
	key: WorkspaceModuleKey;
	colorClass: string;
}

export const workspaceModules: WorkspaceModule[] = [
	{
		key: 'goal_setting',
		colorClass: 'menu-segment--goals'
	},
	{
		key: 'implementation_planning',
		colorClass: 'menu-segment--implementation'
	},
	{
		key: 'impact_measurement',
		colorClass: 'menu-segment--effects'
	},
	{
		key: 'resource_planning',
		colorClass: 'menu-segment--resources'
	},
	{
		key: 'knowledge_transfer',
		colorClass: 'menu-segment--knowledge'
	},
	{
		key: 'rules',
		colorClass: 'menu-segment--rules'
	},
	{
		key: 'organizing',
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
	icon: Component<SvelteHTMLElements['svg']>;
	module: WorkspaceModuleKey;
	/** Map view → URL path (without context segment). The `default` view is the entry view. */
	views: Partial<Record<WorkspaceViewKey, string>> & { default: string };
	featureFlag?: WorkspaceFeatureFlag;
	boardFlag?: WorkspaceBoardFlag;
	adminOnly?: boolean;
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
		icon: Compass,
		module: 'goal_setting',
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
		icon: Goal,
		module: 'goal_setting',
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
		icon: Program,
		module: 'goal_setting',
		views: {
			default: '/programs/level',
			level: '/programs/level'
		}
	},
	// Implementation planning
	{
		key: 'measures',
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
		icon: ChartBar,
		module: 'implementation_planning',
		views: {
			default: '/measures/monitoring',
			monitoring: '/measures/monitoring'
		}
	},
	{
		key: 'tasks',
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
		icon: ChartLine,
		module: 'impact_measurement',
		views: {
			default: '/indicators/catalog',
			catalog: '/indicators/catalog',
			table: '/indicators/table'
		},
		boardFlag: 'board.indicators'
	},
	{
		key: 'reports',
		icon: Chapter,
		module: 'impact_measurement',
		views: {
			default: '/reports/catalog',
			catalog: '/reports/catalog'
		}
	},
	{
		key: 'objectives-and-effects',
		icon: ChartMixed,
		module: 'impact_measurement',
		views: {
			default: '/objectives-and-effects',
			level: '/objectives-and-effects'
		},
		boardFlag: 'board.indicators'
	},
	// Resource planning
	{
		key: 'resources',
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
		key: 'help',
		icon: Help,
		module: 'knowledge_transfer',
		views: {
			default: '/help/catalog',
			catalog: '/help/catalog'
		}
	},
	{
		key: 'guides',
		icon: BookOutline,
		module: 'knowledge_transfer',
		views: {
			default: '/guides/catalog',
			catalog: '/guides/catalog',
			table: '/guides/table'
		}
	},
	{
		key: 'knowledge',
		icon: BookOpenOutline,
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
		icon: RuleDatabase,
		module: 'rules',
		views: {
			default: '/rules/catalog',
			catalog: '/rules/catalog'
		}
	},
	// Organizing
	{
		key: 'pages',
		icon: LandingPage,
		module: 'organizing',
		views: {
			default: '/pages/catalog',
			catalog: '/pages/catalog'
		}
	},
	{
		key: 'templates',
		icon: Template,
		module: 'organizing',
		views: {
			default: '/templates',
			catalog: '/templates'
		}
	},
	{
		key: 'categories',
		icon: Tag,
		module: 'organizing',
		views: {
			default: '/categories',
			level: '/categories'
		}
	},
	{
		key: 'overview',
		icon: Objects,
		module: 'organizing',
		views: {
			default: '/all/catalog',
			catalog: '/all/catalog',
			level: '/all/level',
			page: '/all/page',
			table: '/all/table'
		}
	},
	{
		key: 'users',
		icon: Users,
		module: 'organizing',
		views: {
			default: '/user-management'
		},
		adminOnly: true
	}
];

export const workspaceByKey: Record<string, WorkspaceDefinition> = Object.fromEntries(
	workspaces.map((w) => [w.key, w])
);

interface VisibilityContext {
	organization: OrganizationContainer;
	organizationalUnit?: OrganizationalUnitContainer | null;
	features: WorkspaceFeatureDecisions;
	ability?: MongoAbility;
	user?: User;
}

/**
 * Returns the workspaces that should be shown for the given organization context.
 *
 * Visibility rules:
 * - Workspaces with a `featureFlag` are hidden when the flag is off.
 * - Workspaces with a `boardFlag` are hidden when the board is not enabled
 *   on the organization or organizational unit.
 * - When the organizational unit has a non-empty `visibleWorkspaces`, it takes
 *   precedence over the organization's setting (suborg admins can override).
 * - Otherwise the organization's `visibleWorkspaces` applies; when also empty,
 *   all remaining workspaces are visible (default without explicit choice).
 * - When `visibleWorkspaces` is populated, only the listed workspace keys are
 *   visible.
 * - `hasPermission` provides an extra hook for permission-based filtering
 *   (e.g. categories require `mayCreateContainer` permission).
 */
export function getVisibleWorkspaces(ctx: VisibilityContext): WorkspaceDefinition[] {
	const { organization, organizationalUnit, features, ability, user } = ctx;
	const selectedContext = organizationalUnit ?? organization;
	const enabledBoards = new Set(selectedContext.payload.boards);
	const orgUnitExplicit = organizationalUnit?.payload.visibleWorkspaces ?? [];
	const explicit =
		orgUnitExplicit.length > 0 ? orgUnitExplicit : (organization.payload.visibleWorkspaces ?? []);
	const explicitSet = new Set(explicit);

	const isCtxAdmin =
		user?.roles.includes('sysadmin') ||
		user?.adminOf.includes(selectedContext.guid) ||
		user?.adminOf.includes(selectedContext.organization);

	return workspaces.filter((workspace) => {
		if (workspace.featureFlag && !features[workspace.featureFlag]()) {
			return false;
		}
		if (workspace.boardFlag && !enabledBoards.has(workspace.boardFlag)) {
			return false;
		}
		if (workspace.key === 'help') {
			if (!isOrganizationContainer(selectedContext) || !selectedContext.payload.default) {
				return false;
			}
		}
		if (ability) {
			if (workspace.key === 'categories') {
				const container = containerOfType(
					payloadTypes.enum.category,
					organization.guid,
					organizationalUnit?.guid ?? null,
					selectedContext.guid,
					''
				);
				if (!ability.can('create', container)) {
					return false;
				}
			}
			if (workspace.key === 'help') {
				const container = containerOfType(
					payloadTypes.enum.help,
					organization.guid,
					organizationalUnit?.guid ?? null,
					selectedContext.guid,
					''
				);
				if (!ability.can('create', container)) {
					return false;
				}
			}
			if (workspace.key === 'tasks') {
				if ('default' in selectedContext.payload && selectedContext.payload.default) {
					return false;
				}
			}
		}
		if (workspace.adminOnly) {
			return isCtxAdmin;
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
