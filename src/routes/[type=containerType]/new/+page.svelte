<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ContainerFormTabs from '$lib/components/ContainerFormTabs.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import {
		containerOfType,
		isInternalObjectiveStrategicGoalContainer,
		isInternalStrategyContainer,
		isMilestoneContainer,
		isModelContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isVisionContainer,
		payloadTypes,
		quantities
	} from '$lib/models';
	import type { AnyContainer, CustomEventMap, PayloadType } from '$lib/models';
	import { applicationState } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: isPartOfOptions = data.isPartOfOptions;

	let container = ((type: PayloadType) => {
		const newContainer = containerOfType(
			type,
			$page.data.currentOrganization.guid,
			$page.data.currentOrganizationalUnit?.guid ?? null,
			env.PUBLIC_KC_REALM
		);
		if (newContainer.payload.type === payloadTypes.enum.organizational_unit) {
			newContainer.payload.level = parseInt($page.url.searchParams.get('level') ?? '1');
		} else if (newContainer.payload.type === payloadTypes.enum.page) {
			newContainer.payload.slug = $page.url.searchParams.get('slug') ?? '';
		}
		return newContainer as AnyContainer;
	})($page.params.type as PayloadType);

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('is-part-of', String(detail.result.revision));

		if (
			detail.event.submitter?.id === 'save-and-next' &&
			$applicationState.containerForm.activeTab
		) {
			await goto(`/${$page.params.type}/${detail.result.guid}/edit`);
			$applicationState.containerForm.activeTab =
				$applicationState.containerForm.tabs[
					$applicationState.containerForm.tabs.findIndex(
						(value) => value === $applicationState.containerForm.activeTab
					) + 1
				];
		} else if (detail.event.submitter?.id === 'save-and-create-model') {
			await goto(`/model/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-strategic-goal') {
			await goto(`/strategic_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-operational-goal') {
			await goto(`/operational_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-measure') {
			await goto(`/measure/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-vision') {
			await goto(`/internal_objective.vision/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-internal-objective-strategic-goal') {
			await goto(`/internal_objective.strategic_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-milestone') {
			await goto(`/internal_objective.milestone/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-task') {
			await goto(`/internal_objective.task/new?${params}`);
		} else if (detail.result.payload.type === payloadTypes.enum.organizational_unit) {
			await goto(`/organization/${$page.data.currentOrganization.guid}/organizational_units`);
		} else if (detail.result.payload.type === payloadTypes.enum.page) {
			await goto(`/${detail.result.payload.slug}`);
		} else {
			await goto(`/${$page.params.type}/${detail.result.guid}`);
		}

		if (
			detail.result.payload.type === payloadTypes.enum.organization ||
			detail.result.payload.type === payloadTypes.enum.organizational_unit
		) {
			invalidateAll();
		}
	}
</script>

<Layout>
	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<header class="content-header">
				<label>
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
				{#if $applicationState.containerForm.tabs.length > 0}
					<aside>
						<ContainerFormTabs {container} />
					</aside>
				{/if}
				<ContainerForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
			</div>
			<footer class="content-footer">
				<Visibility {container} />
				<div class="content-actions">
					{#if $applicationState.containerForm.activeTab !== $applicationState.containerForm.tabs[$applicationState.containerForm.tabs.length - 1]}
						<button form="container-form" type="submit">{$_('save')}</button>
						<button class="primary" id="save-and-next" form="container-form" type="submit">
							{$_('save_and_next')}
						</button>
					{:else}
						<button class="primary" form="container-form" type="submit">{$_('save')}</button>
					{/if}
					{#if isModelContainer(container)}
						<button id="save-and-create-strategic-goal" form="container-form" type="submit">
							{$_('save_and_create_strategic_goal')}
						</button>
					{:else if isOperationalGoalContainer(container)}
						<button id="save-and-create-measure" form="container-form" type="submit">
							{$_('save_and_create_measure')}
						</button>
					{:else if isStrategicGoalGoalContainer(container)}
						<button id="save-and-create-operational-goal" form="container-form" type="submit">
							{$_('save_and_create_operational_goal')}
						</button>
					{:else if isStrategyContainer(container)}
						<button id="save-and-create-model" form="container-form" type="submit">
							{$_('save_and_create_model')}
						</button>
					{:else if isInternalStrategyContainer(container)}
						<button id="save-and-create-vision" form="container-form" type="submit">
							{$_('save_and_create_vision')}
						</button>
					{:else if isVisionContainer(container)}
						<button
							id="save-and-create-internal-objective-strategic-goal"
							form="container-form"
							type="submit"
						>
							{$_('save_and_create_strategic_goal')}
						</button>
					{:else if isInternalObjectiveStrategicGoalContainer(container)}
						<button id="save-and-create-milestone" form="container-form" type="submit">
							{$_('save_and_create_milestone')}
						</button>
					{:else if isMilestoneContainer(container)}
						<button id="save-and-create-task" form="container-form" type="submit">
							{$_('save_and_create_task')}
						</button>
					{/if}
					<button type="button" on:click={() => window.history.back()}>{$_('cancel')}</button>
				</div>
			</footer>
		</div>
	</svelte:fragment>
</Layout>
