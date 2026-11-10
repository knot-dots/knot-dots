import type { DatabaseConnection } from 'slonik';
import { createFeatureDecisions } from '$lib/features';
import de from '$lib/locales/de.json';
import {
	isGoalContainer,
	isTaskContainer,
	payloadTypes,
	predicates,
	type AnyPayload,
	type Container,
	type PayloadType
} from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import { featuresOfUser } from '$lib/server/features';
import type { McpAuth } from '$lib/server/mcp/auth';
import { summarizeContainer } from '$lib/server/mcp/containers';
import {
	addSectionToolName,
	dataViewSectionParentTypes,
	type AddSectionInput,
	type AddSectionOutput,
	type McpDataViewSectionType
} from '$lib/server/mcp/contracts/sections';
import {
	createMcpContainerAs,
	findVisibleContainer,
	McpCreationError
} from '$lib/server/mcp/creation';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { runAsRequestUser } from '$lib/server/requestUser';

type FeatureDecisions = ReturnType<typeof createFeatureDecisions>;

function isPartOfMeasure(container: Container<AnyPayload>) {
	return container.relation.some(
		({ predicate }) => predicate === predicates.enum['is-part-of-measure']
	);
}

// What the web application requires of a parent beyond its type, as each
// condition's reason for refusing the section.
const parentConditions: Partial<
	Record<
		McpDataViewSectionType,
		(
			parent: Container<AnyPayload>,
			features: FeatureDecisions,
			input: AddSectionInput
		) => string | undefined
	>
> = {
	[payloadTypes.enum.demographic_data]: (parent) =>
		'geometry' in parent.payload && parent.payload.geometry
			? undefined
			: 'A demographic_data section needs an organizational unit with a geometry.',
	[payloadTypes.enum.effect_collection]: (parent) =>
		isGoalContainer(parent) && !isPartOfMeasure(parent)
			? 'An effect_collection can only be added to a goal that is part of a measure.'
			: undefined,
	// An empty list shows all workspaces.
	[payloadTypes.enum.indicator_collection]: (parent) => {
		const workspaces =
			'visibleWorkspaces' in parent.payload ? parent.payload.visibleWorkspaces : [];
		return workspaces.length === 0 || workspaces.includes('indicators')
			? undefined
			: 'An indicator_collection needs the indicators workspace to be visible.';
	},
	[payloadTypes.enum.objective_collection]: (parent) =>
		isPartOfMeasure(parent)
			? 'An objective_collection cannot be added to a goal that is part of a measure.'
			: undefined,
	[payloadTypes.enum.resource_collection]: (_parent, features) =>
		features.useResourcePlanning()
			? 'With resource planning, add a resource_data_collection instead.'
			: undefined,
	[payloadTypes.enum.resource_data_collection]: (parent, features, { resourceDataType }) => {
		if (!features.useResourcePlanning()) {
			return 'A resource_data_collection needs resource planning (the ResourceV2 feature).';
		}
		const isBudget = resourceDataType === 'resource_data_type.budget';
		if (isBudget === isGoalContainer(parent)) {
			return undefined;
		}
		return isBudget
			? 'Only a goal can show its budget.'
			: 'Only a measure can show its resource allocation.';
	}
};

// The titles the web application gives these sections, in the default
// language. The schema defaults depend on the dictionaries of the web
// application, which the server does not necessarily load.
const titleKeys: Record<McpDataViewSectionType, keyof typeof de> = {
	[payloadTypes.enum.administrative_area_basic_data]: 'administrative_area.basic_data',
	[payloadTypes.enum.demographic_data]: 'demographic_data',
	[payloadTypes.enum.effect_collection]: 'effects',
	[payloadTypes.enum.goal_collection]: 'goals',
	[payloadTypes.enum.indicator_collection]: 'indicators',
	[payloadTypes.enum.map]: 'administrative_area.boundary',
	[payloadTypes.enum.measure_collection]: 'measures',
	[payloadTypes.enum.objective_collection]: 'objectives',
	[payloadTypes.enum.program_collection]: 'programs',
	[payloadTypes.enum.progress]: 'progress',
	[payloadTypes.enum.resource_collection]: 'resources',
	[payloadTypes.enum.resource_data_collection]: 'resource_data',
	[payloadTypes.enum.summary]: 'summary',
	[payloadTypes.enum.task_collection]: 'tasks'
};

// A resource data collection is titled like the heading the web application
// shows for its type of resource data, so that the table of contents tells
// the collections of a parent apart.
function titleOf({ resourceDataType, type }: AddSectionInput, parent: Container<AnyPayload>) {
	if (resourceDataType) {
		return de[resourceDataType];
	}
	return type === payloadTypes.enum.task_collection && isTaskContainer(parent)
		? de.subtasks
		: de[titleKeys[type]];
}

// Like the web application, a parent shows each of these sections once, and
// a resource data collection once per type of resource data.
async function hasSectionOfSameKind(
	connection: DatabaseConnection,
	parent: Container<AnyPayload>,
	{ resourceDataType, type }: AddSectionInput
) {
	const sectionGuids = parent.relation
		.filter(
			({ object, predicate }) =>
				object === parent.guid && predicate === predicates.enum['is-section-of']
		)
		.flatMap(({ subject }) => (subject ? [subject] : []));
	if (sectionGuids.length === 0) {
		return false;
	}
	const sections = await getManyContainers([], { guid: sectionGuids }, 'alpha')(connection);
	return sections.some(
		({ payload }) =>
			payload.type === type &&
			(!('resourceDataType' in payload) || payload.resourceDataType === resourceDataType)
	);
}

// Appends a section showing data related to its parent, created like any
// other section through create_container.
export function addMcpSection(input: AddSectionInput & McpAuth) {
	return (connection: DatabaseConnection): Promise<AddSectionOutput> =>
		runAsRequestUser(input.userId, async () => {
			const { parentGuid, tokenId, type, userId, ...options } = input;
			const user = await loadMcpUserContext(connection, userId);
			const parent = await findVisibleContainer(connection, user, parentGuid);
			if (!parent) {
				throw new McpCreationError('Parent container not found or inaccessible.');
			}

			const parentTypes: readonly PayloadType[] = dataViewSectionParentTypes[type];
			if (!parentTypes.includes(parent.payload.type)) {
				throw new McpCreationError(
					`A ${type} section can only be added to a container of type ${parentTypes.join(', ')}.`
				);
			}
			const features = createFeatureDecisions(await featuresOfUser(user.settings));
			const refusal = parentConditions[type]?.(parent, features, input);
			if (refusal) {
				throw new McpCreationError(refusal);
			}
			if (await hasSectionOfSameKind(connection, parent, input)) {
				throw new McpCreationError(
					`The ${parent.payload.type} has a ${type} section${input.resourceDataType ? ` for ${input.resourceDataType}` : ''} already.`
				);
			}

			const created = await createMcpContainerAs(
				connection,
				user,
				{
					organizationGuid: parent.organization,
					organizationalUnitGuid: null,
					parentRelations: [{ parentGuid, predicate: predicates.enum['is-section-of'] }],
					payload: {
						...Object.fromEntries(
							Object.entries(options).filter(([, value]) => value !== undefined)
						),
						title: titleOf(input, parent),
						type
					},
					tokenId,
					userId
				},
				addSectionToolName
			);
			return { ...summarizeContainer(created), revision: created.revision };
		});
}
