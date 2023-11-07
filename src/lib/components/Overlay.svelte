<script lang="ts">
	import { getContext } from 'svelte';
	import { ArrowsPointingOut, Icon, Pencil, Trash, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import deleteContainer from '$lib/client/deleteContainer';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ContainerFormTabs from '$lib/components/ContainerFormTabs.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import OverlayDeepLinks from '$lib/components/OverlayDeepLinks.svelte';
	import TaskTabs from '$lib/components/TaskTabs.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import {
		isContainer,
		isInternalObjectiveContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isTaskContainer,
		mayDelete,
		payloadTypes
	} from '$lib/models';
	import type { AnyContainer, Container, CustomEventMap } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import ContainerDetailViewTabs from '$lib/components/ContainerDetailViewTabs.svelte';

	export let relatedContainers: Container[];
	export let isPartOfOptions: AnyContainer[];
	export let revisions: AnyContainer[];

	let mayShowRelationButton = getContext('mayShowRelationButton');

	$: container = revisions[revisions.length - 1];

	$: hashParams = paramsFromURL($page.url);
	$: edit = hashParams.has('create') || hashParams.has('edit');

	function closeOverlay() {
		return '#';
	}

	function cancel(c: AnyContainer) {
		if (hashParams.has('create')) {
			return closeOverlay();
		} else {
			return `#view=${c.guid}`;
		}
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
		} else {
			await goto(`#view=${c.guid}`);
		}
	}

	async function handleDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			await invalidateAll();
			await goto(closeOverlay());
		}
	}
</script>

<section class="overlay" transition:slide={{ axis: 'x' }}>
	{#if edit}
		<header class="content-header">
			<label
				style={container.payload.type === payloadTypes.enum.undefined
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
						required
					/>
				{/if}
			</label>
		</header>
		<div class="content-details masked-overflow">
			{#if $applicationState.containerForm.tabs.length > 0}
				<aside>
					<ContainerFormTabs {container} {isPartOfOptions} />
				</aside>
			{/if}
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
				<a class="button" href={cancel(container)}>{$_('cancel')}</a>
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
		<header class="content-header">
			<h2 class="with-icons">
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					{container.payload.name}
				{:else}
					{container.payload.title}
				{/if}
				<span class="icons">
					{#if $ability.can('update', container)}
						<a class="button icons-element" href="#view={container.guid}&edit">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<a
						class="button icons-element"
						href="/{container.payload.type}/{container.guid}"
						title={$_('read_more')}
					>
						<Icon solid src={ArrowsPointingOut} size="20" />
					</a>
					<a href={closeOverlay()} class="button icons-element">
						<Icon solid src={XMark} size="20" />
					</a>
				</span>
			</h2>
			{#if isMeasureContainer(container)}
				<MeasureTabs {container} {revisions} />
			{:else if isTaskContainer(container)}
				<TaskTabs {container} {revisions} />
			{/if}
		</header>
		<div class="content-details masked-overflow">
			{#if 'guid' in container}
				<aside>
					{#if $applicationState.containerDetailView.tabs.length > 0}
						<ContainerDetailViewTabs {container} {relatedContainers} />
					{/if}
					<OverlayDeepLinks {container} />
				</aside>
			{/if}
			{#if isMeasureContainer(container)}
				<MeasureDetailView {container} {relatedContainers} {revisions} />
			{:else if isTaskContainer(container)}
				<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions} />
			{:else if isInternalObjectiveContainer(container)}
				<InternalObjectiveDetailView {container} {relatedContainers} {revisions} />
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
			</div>
		</footer>
	{/if}
</section>

<style>
	.overlay {
		background-color: white;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 80%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.8 - 2px);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 65%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.65 - 2px);
		}
	}
</style>
