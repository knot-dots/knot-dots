<script lang="ts">
	import { getContext } from 'svelte';
	import { ArrowsPointingOut, Icon, Pencil, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import deleteContainer from '$lib/client/deleteContainer';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import saveContainer from '$lib/client/saveContainer';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import IndicatorDetailView from '$lib/components/IndicatorDetailView.svelte';
	import IndicatorTabs from '$lib/components/IndicatorTabs.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureStatusTabs from '$lib/components/MeasureStatusTabs.svelte';
	import OverlayNavigation from '$lib/components/OverlayNavigation.svelte';
	import OverlaySidebar from '$lib/components/OverlaySidebar.svelte';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import TaskStatusTabs from '$lib/components/TaskStatusTabs.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import {
		isContainer,
		isContainerWithEffect,
		isIndicatorContainer,
		isInternalObjectiveContainer,
		isOrganizationalUnitContainer,
		isPageContainer,
		isStrategyContainer,
		isTaskContainer,
		mayDelete,
		newIndicatorTemplateFromIndicator,
		overlayKey,
		payloadTypes,
		quantities
	} from '$lib/models';
	import type {
		AnyContainer,
		Container,
		ContainerWithObjective,
		CustomEventMap,
		IndicatorContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let relatedContainers: Container[];
	export let isPartOfOptions: AnyContainer[];
	export let containersWithObjectives: ContainerWithObjective[] = [];
	export let revisions: AnyContainer[];

	let container: AnyContainer;
	let mayShowRelationButton = getContext('mayShowRelationButton');
	let saveAsIndicatorTemplateDisabled = false;

	$: {
		container = revisions[revisions.length - 1];
		saveAsIndicatorTemplateDisabled = false;
	}

	$: hashParams = paramsFromURL($page.url);
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
		await invalidateAll();
		if (
			detail.event.submitter?.id === 'save-and-next' &&
			$applicationState.containerForm.activeTab
		) {
			await goto(`#view=${detail.result.guid}&edit`);
			$applicationState.containerForm.activeTab =
				$applicationState.containerForm.tabs[
					$applicationState.containerForm.tabs.findIndex(
						(value) => value === $applicationState.containerForm.activeTab
					) + 1
				];
		} else if (hashParams.has('create')) {
			await goto(`#view=${detail.result.guid}`);
		} else if (hashParams.has('edit-help')) {
			const newParams = new URLSearchParams(hashParams);
			newParams.delete('edit-help');
			await goto(`#${newParams.toString()}`);
		} else {
			await goto(`#view=${c.guid}`);
		}
	}

	async function handleDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			await invalidateAll();
			await goto(closeURL());
		}
	}

	function saveIndicatorAsTemplate(c: IndicatorContainer) {
		return async () => {
			saveAsIndicatorTemplateDisabled = true;
			await saveContainer(newIndicatorTemplateFromIndicator(c));
		};
	}
</script>

<section class="overlay" transition:slide={{ axis: 'x' }}>
	<OverlayNavigation {container} />
	{#if isPageContainer(container) && hashParams.has(overlayKey.enum['edit-help'])}
		<header class="content-header">
			<label>
				{$_(`${container.payload.type}`)}
				<input
					form="container-form"
					name="title"
					type="text"
					bind:value={container.payload.title}
					required
				/>
			</label>
		</header>
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
		<header class="content-header">
			<h2>
				{container.payload.title}

				<span class="icons">
					{#if $ability.can('update', container)}
						<a class="button button-nav button-square" href={editHelpURL()}>
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
				</span>
			</h2>
		</header>
		<div class="content-details masked-overflow">
			<PageDetailView {container} />
		</div>
		<footer class="content-footer">
			<div class="content-actions"></div>
		</footer>
	{:else if edit}
		<aside>
			<OverlaySidebar {container} />
		</aside>
		<header class="content-header">
			<label
				style={container.payload.type === payloadTypes.enum.undefined ||
				(container.payload.type === payloadTypes.enum.indicator && !container.payload.quantity)
					? 'visibility: hidden;'
					: undefined}
			>
				{$_(`${container.payload.type}`)}
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					<input
						form="container-form"
						name="name"
						type="text"
						bind:value={container.payload.name}
						required
					/>
				{:else}
					<input
						form="container-form"
						name="title"
						type="text"
						bind:value={container.payload.title}
						readonly={container.payload.type === payloadTypes.enum.indicator &&
							container.payload.quantity !== quantities.enum['quantity.custom']}
						required
					/>
				{/if}
			</label>
		</header>
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
					{#if $applicationState.containerForm.activeTab !== $applicationState.containerForm.tabs[$applicationState.containerForm.tabs.length - 1]}
						<button form="container-form" type="submit">{$_('save')}</button>
						<button class="primary" id="save-and-next" form="container-form" type="submit">
							{$_('save_and_next')}
						</button>
					{:else}
						<button class="primary" form="container-form" type="submit">{$_('save')}</button>
					{/if}
				{/if}
				<a class="button" href={cancelURL()}>{$_('cancel')}</a>
				{#if mayDelete(container)}
					<button
						class="delete quiet"
						title={$_('delete')}
						type="button"
						on:click={() => handleDelete(container)}
					>
						<Icon src={Trash} size="20" />
					</button>
				{/if}
			</div>
		</footer>
	{:else}
		{#if 'guid' in container}
			<aside>
				<OverlaySidebar {container} />
			</aside>
		{/if}
		<header class="content-header">
			<h2>
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					{container.payload.name}
				{:else}
					{container.payload.title}
				{/if}
				<span class="icons">
					{#if $ability.can('update', container)}
						<a class="button button-nav button-square" href="#view={container.guid}&edit">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<a
						class="button button-nav button-square"
						href="/{container.payload.type}/{container.guid}"
						title={$_('read_more')}
					>
						<Icon solid src={ArrowsPointingOut} size="20" />
					</a>
				</span>
			</h2>
			{#if isIndicatorContainer(container)}
				<IndicatorTabs />
			{:else if isContainerWithEffect(container)}
				<MeasureStatusTabs {container} {revisions} />
			{:else if isTaskContainer(container)}
				<TaskStatusTabs {container} {revisions} />
			{/if}
		</header>
		<div class="content-details masked-overflow">
			{#if isIndicatorContainer(container)}
				<IndicatorDetailView
					{container}
					{containersWithObjectives}
					{relatedContainers}
					{revisions}
				/>
			{:else if isContainerWithEffect(container)}
				<MeasureDetailView {container} {relatedContainers} {revisions} />
			{:else if isTaskContainer(container)}
				<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions} />
			{:else if isInternalObjectiveContainer(container)}
				<InternalObjectiveDetailView {container} {relatedContainers} {revisions} />
			{:else if isStrategyContainer(container)}
				<StrategyDetailView {container} {relatedContainers} {revisions} />
			{:else if isOrganizationalUnitContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{:else if isContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{/if}
		</div>
		<footer class="content-footer">
			<div class="content-actions">
				{#if mayShowRelationButton && $ability.can('relate', container)}
					<a class="button" href="#relate={container.guid}">
						{$_('relations')}
					</a>
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

<style>
	.overlay {
		background-color: white;
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		height: 100vh;
		position: relative;
		top: calc(var(--nav-height) * -1);
	}

	.overlay > aside {
		min-width: 0;
		padding: 1.5rem 0.5rem 0;
		position: absolute;
		top: var(--nav-height);
		width: 3.5rem;
	}

	.overlay > aside ~ * {
		margin-left: 3.5rem;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 80%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.8 - 3.5rem);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 65%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.65 - 3.5rem);
		}
	}
</style>
