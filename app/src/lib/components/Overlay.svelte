<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import Pencil from '~icons/heroicons/pencil-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import Trash from '~icons/heroicons/trash';
	import CopyCat from '~icons/knotdots/copycat';
	import Maximize from '~icons/knotdots/maximize';
	import Minimize from '~icons/knotdots/minimize';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import createEffect from '$lib/client/createEffect';
	import createObjective from '$lib/client/createObjective';
	import deleteContainer from '$lib/client/deleteContainer';
	import saveContainer from '$lib/client/saveContainer';
	import AssigneeFilter from '$lib/components/AssigneeFilter.svelte';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Chapters from '$lib/components/Chapters.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ContainerDetailViewTabs from '$lib/components/ContainerDetailViewTabs.svelte';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ContainerFormTabs from '$lib/components/ContainerFormTabs.svelte';
	import EffectDetailView from '$lib/components/EffectDetailView.svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import IndicatorCategoryFilter from '$lib/components/IndicatorCategoryFilter.svelte';
	import IndicatorDetailView from '$lib/components/IndicatorDetailView.svelte';
	import IndicatorTabs from '$lib/components/IndicatorTabs.svelte';
	import IndicatorTypeFilter from '$lib/components/IndicatorTypeFilter.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import MeasureStatusTabs from '$lib/components/MeasureStatusTabs.svelte';
	import MeasureTypeFilter from '$lib/components/MeasureTypeFilter.svelte';
	import MeasureResultDetailView from '$lib/components/MeasureResultDetailView.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import Members from '$lib/components/Members.svelte';
	import NewMeasureMonitoring from '$lib/components/NewMeasureMonitoring.svelte';
	import ObjectiveDetailView from '$lib/components/ObjectiveDetailView.svelte';
	import OverlayNavigation from '$lib/components/OverlayNavigation.svelte';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import PayloadTypeFilter from '$lib/components/PayloadTypeFilter.svelte';
	import Relations from '$lib/components/Relations.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import ResolutionDetailView from '$lib/components/ResolutionDetailView.svelte';
	import ResolutionStatusTabs from '$lib/components/ResolutionStatusTabs.svelte';
	import ResourceDetailView from '$lib/components/ResourceDetailView.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TaskCategoryFilter from '$lib/components/TaskCategoryFilter.svelte';
	import TaskDetailView from '$lib/components/TaskDetailView.svelte';
	import TaskStatusTabs from '$lib/components/TaskStatusTabs.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		type Container,
		type CustomEventMap,
		findOverallObjective,
		type IndicatorContainer,
		isContainer,
		isContainerWithEffect,
		isEffectContainer,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureResultContainer,
		isObjectiveContainer,
		isPageContainer,
		isResolutionContainer,
		isResourceContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		isTaskContainer,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		newIndicatorTemplateFromIndicator,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates,
		quantities,
		type TaskContainer,
		type User
	} from '$lib/models';
	import {
		ability,
		addEffectState,
		addObjectiveState,
		mayDeleteContainer,
		overlayHistory,
		overlayWidth,
		user
	} from '$lib/stores';

	export let indicators: IndicatorContainer[] | undefined = undefined;
	export let measures: MeasureContainer[] | undefined = undefined;
	export let measureElements: MeasureMonitoringContainer[] | undefined = undefined;
	export let isPartOfOptions: AnyContainer[];
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
	export let tasks: TaskContainer[] | undefined = undefined;
	export let users: User[] | undefined = undefined;

	setContext('overlay', true);

	let container: AnyContainer;
	let mayShowRelationButton = getContext('mayShowRelationButton');
	let saveAsIndicatorTemplateDisabled = false;
	let confirmDeleteDialog: HTMLDialogElement;

	$: {
		container = revisions[revisions.length - 1];
		saveAsIndicatorTemplateDisabled = false;
	}

	$: hashParams = paramsFromFragment($page.url);
	$: edit = hashParams.has(overlayKey.enum.create) || hashParams.has(overlayKey.enum.edit);

	function closeURL() {
		if (hashParams.has(overlayKey.enum['view-help'])) {
			const newParams = new URLSearchParams(
				[...hashParams.entries()].filter(([key]) => key != overlayKey.enum['view-help'])
			);
			return `#${newParams.toString()}`;
		} else {
			const newParams = new URLSearchParams(
				[...hashParams.entries()].filter(([key]) => key == overlayKey.enum.relate)
			);
			return `#${newParams.toString()}`;
		}
	}

	function cancelURL() {
		const newParams = new URLSearchParams(hashParams);

		if (newParams.has(overlayKey.enum['edit-help'])) {
			newParams.delete(overlayKey.enum['edit-help']);
		} else {
			newParams.delete(overlayKey.enum.create);
			newParams.delete(overlayKey.enum.edit);
		}

		return `#${newParams.toString()}`;
	}

	function editHelpURL() {
		const newParams = new URLSearchParams(hashParams);
		newParams.set(overlayKey.enum['edit-help'], '');
		return `#${newParams.toString()}`;
	}

	async function afterSubmit(
		{ detail }: CustomEvent<CustomEventMap['submitSuccessful']>,
		c: AnyContainer
	) {
		if (
			hashParams.has(overlayKey.enum.create) &&
			isIndicatorContainer(detail.result) &&
			$addEffectState.target
		) {
			const effect = await createEffect($addEffectState.target, detail.result);
			$addEffectState = {};
			await goto(`#view=${effect.guid}&edit`, { invalidateAll: true });
		} else if (
			hashParams.has(overlayKey.enum.create) &&
			isIndicatorContainer(detail.result) &&
			$addObjectiveState.target
		) {
			const objective = await createObjective($addObjectiveState.target, detail.result);
			$addObjectiveState = {};
			await goto(`#view=${objective.guid}&edit`, { invalidateAll: true });
		} else if (hashParams.has('create')) {
			await goto(`#view=${detail.result.guid}`, { invalidateAll: true });
		} else if (hashParams.has('edit-help')) {
			const newParams = new URLSearchParams(hashParams);
			newParams.delete('edit-help');
			await goto(`#${newParams.toString()}`, { invalidateAll: true });
		} else {
			await goto(`#view=${c.guid}`, { invalidateAll: true });
		}
	}

	async function handleDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
				await goto(`#${newParams.toString()}`, { invalidateAll: true });
			} else {
				await goto(closeURL(), { invalidateAll: true });
			}
		}
		confirmDeleteDialog.close();
	}

	function saveIndicatorAsTemplate(c: IndicatorContainer) {
		return async () => {
			saveAsIndicatorTemplateDisabled = true;
			await saveContainer(newIndicatorTemplateFromIndicator(c));
		};
	}

	function createOverallObjective(c: IndicatorContainer) {
		return async () => {
			const objective = await createObjective(c, c);
			await goto(`#view=${objective.guid}&edit`, { invalidateAll: true });
		};
	}

	let fullScreen = false;

	function toggleFullscreen() {
		fullScreen = !fullScreen;
	}

	let offset = 0;

	function startExpand(event: MouseEvent) {
		offset = event.offsetX - 12;
		window.addEventListener('mousemove', expand);
	}

	function stopExpand() {
		window.removeEventListener('mousemove', expand);
	}

	function expand(event: MouseEvent) {
		$overlayWidth = (window.innerWidth - event.pageX + offset) / window.innerWidth;

		if ($overlayWidth * window.innerWidth < 320) {
			$overlayWidth = 320 / window.innerWidth;
		} else if ($overlayWidth * window.innerWidth > window.innerWidth - 400) {
			$overlayWidth = 1 - 400 / window.innerWidth;
		}
	}

	function mayDeriveFrom(container: AnyContainer) {
		return container.relation.some(
			({ predicate }) =>
				predicate === predicates.enum['is-part-of-strategy'] ||
				predicate === predicates.enum['is-part-of-measure']
		);
	}

	async function createAnother(container: AnyContainer) {
		const isPartOfStrategyRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-strategy']
		);
		const isPartOfMeasureRelation = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		);

		const params = new URLSearchParams();
		params.append(overlayKey.enum.create, 'undefined');

		if (isPartOfStrategyRelation) {
			const strategy = relatedContainers
				.filter(isStrategyContainer)
				.find(({ relation }) =>
					relation.some(
						({ predicate, object }) =>
							object == isPartOfStrategyRelation.object &&
							predicate == isPartOfStrategyRelation.predicate
					)
				);
			params.append(
				predicates.enum['is-part-of-strategy'],
				String(isPartOfStrategyRelation.object)
			);
			params.append('position', String(isPartOfStrategyRelation.position + 1));
			for (const payloadType of strategy?.payload.chapterType ?? []) {
				params.append('payloadType', payloadType);
			}
		}

		if (isPartOfMeasureRelation) {
			params.append(predicates.enum['is-part-of-measure'], String(isPartOfMeasureRelation.object));
			params.append('payloadType', payloadTypes.enum.measure_result);
			params.append('payloadType', payloadTypes.enum.milestone);
			params.append('payloadType', payloadTypes.enum.task);
		}

		await goto(`#${params.toString()}`, { state: { derivedFrom: container } });
	}

	async function createCopy(container: AnyContainer) {
		await goto(`#create=${container.payload.type}&copy-of=${container.guid}`);
	}
</script>

<svelte:window on:mouseup={stopExpand} />

<section
	class="overlay"
	class:overlay-fullscreen={fullScreen}
	transition:slide={{ axis: 'x' }}
	style="--width-factor: {$overlayWidth}"
>
	<!--svelte-ignore a11y-no-static-element-interactions -->
	<div class="resize-handle" on:mousedown|preventDefault={startExpand} />
	<OverlayNavigation {container} />
	{#if isPageContainer(container) && hashParams.has(overlayKey.enum['edit-help'])}
		<aside>
			<Sidebar>
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<div class="content-details masked-overflow">
			<ContainerForm
				bind:container
				isPartOfOptions={[]}
				on:submitSuccessful={(e) => afterSubmit(e, container)}
			/>
		</div>
		<footer class="content-footer">
			<div class="content-actions">
				<button class="primary" form="container-form" type="submit">{$_('save')}</button>
				<a class="button" href={cancelURL()}>{$_('cancel')}</a>
			</div>
		</footer>
	{:else if isPageContainer(container) && hashParams.has(overlayKey.enum['view-help'])}
		<aside>
			<Sidebar>
				<svelte:fragment slot="tabs">
					{#if $ability.can('update', container)}
						<li>
							<a class="button button-nav button-square" href={editHelpURL()}>
								<Pencil />
							</a>
						</li>
					{/if}
				</svelte:fragment>
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<div class="content-details masked-overflow">
			<PageDetailView {container} />
		</div>
		<footer class="content-footer">
			<div class="content-actions"></div>
		</footer>
	{:else if edit}
		<aside>
			{#if isIndicatorContainer(container) && !container.payload.quantity}
				<Sidebar helpSlug={`${container.payload.type.replace('_', '-')}-edit`}>
					<svelte:fragment slot="filters">
						<IndicatorCategoryFilter />
						<MeasureTypeFilter />
						<CategoryFilter />
						<TopicFilter />
						<IndicatorTypeFilter />
					</svelte:fragment>
					<svelte:fragment slot="extra">
						<li>
							<button
								class="button-nav button-square"
								on:click={toggleFullscreen}
								title={$_('full_screen')}
							>
								{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
							</button>
						</li>
					</svelte:fragment>
				</Sidebar>
			{:else}
				<Sidebar helpSlug={`${container.payload.type.replace('_', '-')}-edit`}>
					<ContainerFormTabs {container} slot="tabs" />
					<svelte:fragment slot="extra">
						<li>
							<button
								class="button-nav button-square"
								on:click={toggleFullscreen}
								title={$_('full_screen')}
							>
								{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
							</button>
						</li>
					</svelte:fragment>
				</Sidebar>
			{/if}
		</aside>
		<div class="content-details masked-overflow">
			<ContainerForm
				bind:container
				{isPartOfOptions}
				on:submitSuccessful={(e) => afterSubmit(e, container)}
			/>
		</div>
		<footer class="content-footer">
			{#if container.payload.type !== payloadTypes.enum.undefined}
				<Visibility {container} />
			{/if}
			<div class="content-actions">
				{#if container.payload.type !== payloadTypes.enum.undefined}
					<button class="primary" form="container-form" type="submit">{$_('save')}</button>
				{/if}
				<a class="button" href={cancelURL()}>{$_('cancel')}</a>
				{#if $mayDeleteContainer(container)}
					<button
						class="delete quiet"
						title={$_('delete')}
						type="button"
						on:click={() => confirmDeleteDialog.showModal()}
					>
						<Trash />
					</button>
				{/if}
			</div>
		</footer>
	{:else if hashParams.has(overlayKey.enum.members) && users}
		<aside>
			<Sidebar helpSlug="overlay-members">
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<div class="content-details masked-overflow">
			<Members {container} {users} />
		</div>
	{:else if hashParams.has(overlayKey.enum.chapters) && isStrategyContainer(container) && relatedContainers}
		<aside>
			<Sidebar helpSlug="chapters">
				<Search slot="search" />
				<svelte:fragment slot="filters">
					<AudienceFilter />
					<CategoryFilter />
					<TopicFilter />
				</svelte:fragment>
				<Sort slot="sort" />
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<Chapters containers={relatedContainers} />
	{:else if hashParams.has(overlayKey.enum.relations) && relatedContainers}
		<aside>
			<Sidebar helpSlug="relations">
				<Search slot="search" />
				<svelte:fragment slot="filters">
					<RelationTypeFilter />
					<AudienceFilter />
					<CategoryFilter />
					<TopicFilter />
					<StrategyTypeFilter />
				</svelte:fragment>
				<Sort slot="sort" />
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<Relations containers={relatedContainers} />
	{:else if hashParams.has(overlayKey.enum['measures']) && isStrategyContainer(container) && measures}
		<aside>
			<Sidebar helpSlug="overlay-measures">
				<svelte:fragment slot="filters">
					<AudienceFilter />
					<CategoryFilter />
					<TopicFilter />
					<MeasureTypeFilter />
				</svelte:fragment>
				<Sort slot="sort" />
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<Measures containers={measures} />
	{:else if hashParams.has(overlayKey.enum['measure-monitoring']) && (isMeasureContainer(container) || isSimpleMeasureContainer(container)) && measureElements && indicators}
		<aside>
			<Sidebar helpSlug="internal-objectives">
				<Search slot="search" />
				<Sort slot="sort" />
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		{#if createFeatureDecisions($page.data.features).useNewMeasureMonitoringBoard()}
			<NewMeasureMonitoring measures={[container]} containers={measureElements} {indicators} />
		{:else}
			<MeasureMonitoring {container} containers={measureElements} {indicators} />
		{/if}
	{:else if hashParams.has(overlayKey.enum.tasks) && tasks && relatedContainers}
		<aside>
			<Sidebar helpSlug="overlay-tasks">
				<Search slot="search" />
				<svelte:fragment slot="filters">
					<TaskCategoryFilter />
					<AssigneeFilter />
				</svelte:fragment>
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<Tasks {container} containers={tasks} {relatedContainers} />
	{:else if hashParams.has(overlayKey.enum.indicators) && indicators}
		<aside>
			<Sidebar helpSlug="overlay-indicators">
				<svelte:fragment slot="extra">
					<li>
						<button
							class="button-nav button-square"
							on:click={toggleFullscreen}
							title={$_('full_screen')}
						>
							{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
						</button>
					</li>
				</svelte:fragment>
			</Sidebar>
		</aside>
		<Indicators containers={indicators} />
	{:else if 'guid' in container}
		<aside>
			{#if isStrategyContainer(container)}
				<Sidebar helpSlug={`${container.payload.type.replace('_', '-')}-view`}>
					<svelte:fragment slot="filters">
						<PayloadTypeFilter
							options={Array.from(
								new Set(
									relatedContainers
										.filter(({ guid, relation }) =>
											relation.some(
												({ predicate }) =>
													predicate == predicates.enum['is-part-of-strategy'] &&
													guid != container.guid
											)
										)
										.map(({ payload }) => payload.type)
								)
							)}
						/>
						<CategoryFilter />
						<TopicFilter />
					</svelte:fragment>
					<ContainerDetailViewTabs {container} slot="tabs" />
					<svelte:fragment slot="extra">
						<li>
							<button
								class="button-nav button-square"
								on:click={toggleFullscreen}
								title={$_('full_screen')}
							>
								{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
							</button>
						</li>
					</svelte:fragment>
				</Sidebar>
			{:else}
				<Sidebar helpSlug={`${container.payload.type.replace('_', '-')}-view`}>
					<ContainerDetailViewTabs {container} slot="tabs" />
					<svelte:fragment slot="extra">
						<li>
							<button
								class="button-nav button-square"
								on:click={toggleFullscreen}
								title={$_('full_screen')}
							>
								{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
							</button>
						</li>
					</svelte:fragment>
				</Sidebar>
			{/if}
		</aside>
		{#if isIndicatorContainer(container)}
			<header class="content-header">
				<IndicatorTabs {container} />
			</header>
		{:else if isContainerWithEffect(container)}
			<header class="content-header">
				<MeasureStatusTabs {container} {revisions} />
			</header>
		{:else if isResolutionContainer(container)}
			<header class="content-header">
				<ResolutionStatusTabs {container} {revisions} />
			</header>
		{:else if isTaskContainer(container)}
			<header class="content-header">
				<TaskStatusTabs {container} {revisions} />
			</header>
		{/if}
		<div class="content-details masked-overflow">
			{#if isEffectContainer(container)}
				<EffectDetailView {container} {relatedContainers} {revisions} />
			{:else if isIndicatorContainer(container)}
				<IndicatorDetailView {container} {relatedContainers} {revisions} />
			{:else if isContainerWithEffect(container)}
				<MeasureDetailView {container} {relatedContainers} {revisions} />
			{:else if isMeasureResultContainer(container)}
				<MeasureResultDetailView {container} {relatedContainers} {revisions} />
			{:else if isObjectiveContainer(container)}
				<ObjectiveDetailView {container} {relatedContainers} {revisions} />
			{:else if isResolutionContainer(container)}
				<ResolutionDetailView {container} {relatedContainers} {revisions} />
			{:else if isResourceContainer(container)}
				<ResourceDetailView {container} {relatedContainers} {revisions} />
			{:else if isStrategyContainer(container)}
				<StrategyDetailView {container} {relatedContainers} {revisions} />
			{:else if isTaskContainer(container)}
				<TaskDetailView {container} {relatedContainers} {revisions} />
			{:else if isContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{/if}
		</div>
		<footer class="content-footer">
			<div class="content-actions">
				{#if isIndicatorContainer(container) && !findOverallObjective(container, relatedContainers) && $ability.can('create', payloadTypes.enum.objective)}
					<button type="button" on:click={createOverallObjective(container)}>
						<PlusSmall />{$_('overall_objective')}
					</button>
				{/if}
				{#if mayShowRelationButton && $ability.can('relate', container)}
					<a class="button" href="#relate={container.guid}">
						{$_('establish_relations')}
					</a>
				{/if}
				{#if $ability.can('create', payloadTypes.enum.undefined) && mayDeriveFrom(container)}
					<button class="primary" type="button" on:click={() => createAnother(container)}>
						<PlusSmall />{$_('create_another')}
					</button>
				{/if}
				{#if $user.adminOf.length > 0 && $ability.can('create', container.payload.type)}
					<button
						class="button-copycat"
						title={$_('copy')}
						type="button"
						on:click={() => createCopy(container)}
					>
						<CopyCat />
					</button>
				{/if}
				{#if isIndicatorContainer(container) && container.payload.quantity === quantities.enum['quantity.custom'] && $ability.can('create', payloadTypes.enum.indicator_template)}
					<button
						type="button"
						on:click={saveIndicatorAsTemplate(container)}
						disabled={saveAsIndicatorTemplateDisabled}
					>
						{$_('indicator.save_as_template')}
					</button>
				{/if}
			</div>
		</footer>
	{/if}
</section>

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	handleSubmit={() => handleDelete(container)}
	{container}
	{relatedContainers}
/>

<style>
	.overlay.overlay-fullscreen {
		margin-left: -3.875rem;
		width: 100vw;
	}

	.overlay > aside {
		font-size: 0.875rem;
		height: calc(100vh - var(--nav-height));
		min-width: 0;
		padding: 1.5rem 0.5rem 0.5rem;
		position: absolute;
		top: var(--nav-height);
		width: 3.5rem;
	}

	.overlay > aside ~ :global(*) {
		margin-left: 3.5rem;
	}

	@media (min-width: 768px) {
		.overlay {
			--width-factor: 0.65;

			width: calc(100% * var(--width-factor));
		}

		.overlay > * {
			min-width: calc(100vw * var(--width-factor) - 3.5rem);
		}

		.overlay > :global(nav) {
			min-width: calc(100vw * var(--width-factor));
		}
	}

	.resize-handle {
		background-image: url(/src/lib/assets/resize-handle.svg);
		background-position: 2px center;
		background-repeat: no-repeat;
		background-clip: border-box;
		border-right: solid 2px transparent;
		cursor: ew-resize;
		height: 100%;
		left: -0.75rem;
		min-width: 0;
		position: absolute;
		width: 0.75rem;
		z-index: 1;
	}

	.resize-handle:active,
	.resize-handle:hover {
		border-color: var(--focus-color);
	}
</style>
