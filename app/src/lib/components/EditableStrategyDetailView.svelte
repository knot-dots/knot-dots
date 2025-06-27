<script lang="ts">
	import { getContext } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dragHandleZone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import StrategyProperties from '$lib/components/StrategyProperties.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		type Container,
		containerOfType,
		type NewContainer,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates,
		type StrategyContainer
	} from '$lib/models';
	import { ability, applicationState, newContainer } from '$lib/stores';

	interface Props {
		container: StrategyContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let {
		container = $bindable(),
		relatedContainers: originalRelatedContainers,
		revisions
	}: Props = $props();

	let relatedContainers = $state(originalRelatedContainers);

	let parts = $derived(
		relatedContainers
			.filter(({ guid, relation }) =>
				relation.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-strategy'] && guid != container.guid
				)
			)
			.filter(({ payload }) => byPayloadType(payload.type, page.url))
	);

	function handleDndConsider(event: CustomEvent<DndEvent<Container>>) {
		parts = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<DndEvent<Container>>) {
		parts = event.detail.items;
		const relation = [
			...parts.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate: predicates.enum['is-part-of-strategy'],
				subject: guid
			})),
			...container.relation.filter(
				({ predicate }) => predicate !== predicates.enum['is-part-of-strategy']
			)
		];

		const url = `/container/${container.guid}/relation`;
		await fetch(url, {
			method: 'POST',
			body: JSON.stringify(relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer(event: Event) {
		if (!(event as CustomEvent).detail.selected) {
			return;
		}

		const chapter = containerOfType(
			(event as CustomEvent).detail.selected as PayloadType,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		chapter.relation = [
			{ object: container.guid, predicate: predicates.enum['is-part-of-strategy'], position: 0 }
		];

		$newContainer = chapter;

		createContainerDialog.getElement().showModal();
	}

	function addChapterURL(url: URL, strategyGuid: string) {
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', strategyGuid);
		for (const payloadType of container.payload.chapterType) {
			params.append('payloadType', payloadType);
		}
		return `#${params.toString()}`;
	}

	function byPayloadType(payloadType: PayloadType, url: URL) {
		const params = paramsFromFragment(url);
		return !params.has('type') || params.getAll('type').includes(payloadType);
	}

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

{#snippet row(parts: Container[], dragEnabled: boolean)}
	{#each parts as part, i (part.guid)}
		<form
			class="row"
			animate:flip={{ duration: 100 }}
			oninput={requestSubmit}
			onsubmit={autoSave(part, 2000)}
			novalidate
		>
			<!-- svelte-ignore binding_property_non_reactive -->
			<EditableRow
				columns={[
					'action',
					'title',
					'type',
					'description',
					'visibility',
					'status',
					'category',
					'topic',
					'policyFieldBNK',
					'audience',
					'fulfillmentDate',
					'duration',
					'editorialState',
					'organizationalUnit'
				]}
				bind:container={parts[i]}
				{dragEnabled}
				editable={$applicationState.containerDetailView.editable}
			/>
		</form>
	{/each}
{/snippet}

{#if $applicationState.containerDetailView.mode === 'view_mode.preview'}
	<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
		{#snippet data()}
			<StrategyProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>

			<div class="chapters">
				{#each parts as part, i (part.guid)}
					<form
						class="chapter"
						oninput={stopPropagation(requestSubmit)}
						onsubmit={autoSave(part, 2000)}
						novalidate
					>
						<!-- svelte-ignore binding_property_non_reactive -->
						<EditableChapter
							bind:container={parts[i]}
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', part)}
							headingTag="h3"
							isPartOf={container}
							{relatedContainers}
						/>
					</form>
				{:else}
					{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, page.data.currentOrganization.guid, page.data.currentOrganizationalUnit?.guid ?? null, container.managed_by, env.PUBLIC_KC_REALM))}
						{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
							<DropDownMenu
								handleChange={createContainer}
								label={$_('chapter')}
								options={container.payload.chapterType.map((t) => ({ label: $_(t), value: t }))}
							>
								{#snippet icon()}<PlusSmall />{/snippet}
							</DropDownMenu>
						{:else}
							<a class="button" href={addChapterURL(page.url, container.guid)}>
								<PlusSmall />
								{$_('chapter')}
							</a>
						{/if}
					{/if}
				{/each}
			</div>
		{/snippet}
	</EditableContainerDetailView>
{:else if $applicationState.containerDetailView.mode === 'view_mode.table'}
	<div class="table-wrapper">
		<div class="table">
			<div class="table-head">
				<div class="row">
					<div class="cell cell--action"></div>
					<div class="cell">{$_('title')}</div>
					<div class="cell">{$_('object')}</div>
					<div class="cell">{$_('description')}</div>
					<div class="cell">{$_('visibility.label')}</div>
					<div class="cell">{$_('status')}</div>
					<div class="cell">{$_('category')}</div>
					<div class="cell">{$_('topic')}</div>
					<div class="cell">{$_('policy_field_bnk')}</div>
					<div class="cell">{$_('audience')}</div>
					<div class="cell">{$_('fulfillment_date')}</div>
					<div class="cell">{$_('planned_duration')}</div>
					<div class="cell">{$_('editorial_state')}</div>
					<div class="cell">{$_('organizational_unit')}</div>
				</div>
			</div>
			{#if $ability.cannot('update', container) || paramsFromFragment(page.url).has('type')}
				<div class="table-body">
					{@render row(parts, false)}
				</div>
			{:else}
				<div
					class="table-body"
					use:dragHandleZone={{ items: parts, flipDurationMs: 100 }}
					onconsider={handleDndConsider}
					onfinalize={handleDndFinalize}
				>
					{@render row(parts, true)}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.chapter {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		max-width: 50rem;
	}

	.table-wrapper {
		container-type: inline-size;
		height: 100%;
		margin: 1.5rem 0 1.5rem 1.5rem;
		overflow: auto;
	}

	.table {
		width: fit-content;
	}

	.table-head .cell {
		white-space: nowrap;
	}
</style>
