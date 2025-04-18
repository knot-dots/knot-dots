<script lang="ts">
	import { getContext } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dragHandleZone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import autoSave from '$lib/client/autoSave';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import EditableChapterType from '$lib/components/EditableChapterType.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditableLevel from '$lib/components/EditableLevel.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditablePDF from '$lib/components/EditablePDF.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import EditableStrategyType from '$lib/components/EditableStrategyType.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import Search from '$lib/components/Search.svelte';
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

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: AnyContainer[];

	$: parts = relatedContainers
		.filter(({ guid, relation }) =>
			relation.some(
				({ predicate }) =>
					predicate === predicates.enum['is-part-of-strategy'] && guid != container.guid
			)
		)
		.filter(({ payload }) => byPayloadType(payload.type, $page.url));

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
		$newContainer = containerOfType(
			(event as CustomEvent).detail.selected as PayloadType,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		$newContainer.relation = [
			{ object: container.guid, predicate: predicates.enum['is-part-of-strategy'], position: 0 }
		];

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
		return !params.has('payloadType') || params.getAll('payloadType').includes(payloadType);
	}
</script>

{#if $applicationState.containerDetailView.mode === 'view_mode.preview'}
	<EditableContainerDetailView {container} {relatedContainers} {revisions} tabs={['basic-data']}>
		<svelte:fragment slot="data">
			<EditableLevel
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.level}
			/>

			<EditableStrategyType
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.strategyType}
			/>

			<EditableImage
				editable={$applicationState.containerDetailView.editable}
				label={$_('cover')}
				bind:value={container.payload.image}
			/>

			<EditablePDF
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.pdf}
			/>

			<EditableChapterType
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.chapterType}
			/>

			<EditableTopic
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.topic}
			/>

			<EditablePolicyFieldBNK
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.policyFieldBNK}
			/>

			<EditableCategory
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.category}
			/>

			<EditableAudience
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.audience}
			/>

			<EditableOrganization
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container.payload.type, 'organization')}
				bind:value={container.organization}
			/>

			<EditableOrganizationalUnit
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container.payload.type, 'organizational_unit')}
				organization={container.organization}
				bind:value={container.organizational_unit}
			/>
		</svelte:fragment>

		<svelte:fragment slot="extra">
			<div class="chapters">
				{#each parts as part}
					<form class="chapter" on:submit|preventDefault={autoSave(part)} novalidate>
						<EditableChapter
							container={part}
							editable={$applicationState.containerDetailView.editable}
							headingTag="h3"
							isPartOf={container}
							{relatedContainers}
						/>
					</form>
				{:else}
					{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, $page.data.currentOrganization.guid, $page.data.currentOrganizationalUnit?.guid ?? null, container.managed_by, env.PUBLIC_KC_REALM))}
						{#if createFeatureDecisions($page.data.features).useEditableDetailView()}
							<DropDownMenu
								handleChange={createContainer}
								label={$_('chapter')}
								options={container.payload.chapterType.map((t) => ({ label: $_(t), value: t }))}
							>
								{#snippet icon()}<PlusSmall />{/snippet}
							</DropDownMenu>
						{:else}
							<a class="button" href={addChapterURL($page.url, container.guid)}>
								<PlusSmall />
								{$_('chapter')}
							</a>
						{/if}
					{/if}
				{/each}
			</div>
		</svelte:fragment>
	</EditableContainerDetailView>
{:else if $applicationState.containerDetailView.mode === 'view_mode.table'}
	<article class="details">
		<div class="details-tab" id="basic-data">
			<h2 class="details-title">
				{container.payload.title}
				<Search />
			</h2>
		</div>

		<div class="details-tab details-tab--table" id="chapters">
			<div class="table">
				<div class="table-head">
					<div class="row">
						<div class="cell"></div>
						<div class="cell">{$_('title')}</div>
						<div class="cell">{$_('object')}</div>
						<div class="cell">{$_('description')}</div>
						<div class="cell">{$_('visibility.label')}</div>
						<div class="cell">{$_('status')}</div>
						<div class="cell">{$_('category')}</div>
						<div class="cell">{$_('topic')}</div>
						<div class="cell">{$_('audience')}</div>
						<div class="cell">{$_('fulfillment_date')}</div>
						<div class="cell">{$_('planned_duration')}</div>
						<div class="cell">{$_('organizational_unit')}</div>
					</div>
				</div>
				<div
					class="table-body"
					use:dragHandleZone={{ items: parts, flipDurationMs: 100 }}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
				>
					{#each parts as part (part.guid)}
						<form
							class="row"
							animate:flip={{ duration: 100 }}
							on:submit|preventDefault={autoSave(part)}
							novalidate
						>
							<EditableRow
								container={part}
								editable={$applicationState.containerDetailView.editable ?? false}
							/>
						</form>
					{/each}
				</div>
			</div>
		</div>
	</article>
{/if}

<style>
	h2 :global(.search) {
		flex-basis: 24rem;
		font-size: 1rem;
		font-weight: normal;
	}

	.chapter {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		max-width: 50rem;
	}

	.details-tab.details-tab--table {
		overflow-x: auto;
	}

	.table {
		width: fit-content;
	}

	.table-head .cell {
		padding: 0.5rem;
		white-space: nowrap;
	}

	.row:hover,
	.row:hover :global(input) {
		background-color: var(--color-gray-050);
	}
</style>
