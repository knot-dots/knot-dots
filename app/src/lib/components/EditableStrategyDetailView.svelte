<script lang="ts">
	import { flip } from 'svelte/animate';
	import { _ } from 'svelte-i18n';
	import { dragHandleZone } from 'svelte-dnd-action';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import debouncedSave from '$lib/client/debouncedSave';
	import saveContainer from '$lib/client/saveContainer';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import EditableChapterType from '$lib/components/EditableChapterType.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableLevel from '$lib/components/EditableLevel.svelte';
	import EditableOwnedBy from '$lib/components/EditableOwnedBy.svelte';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import EditableStrategyType from '$lib/components/EditableStrategyType.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import {
		type AnyContainer,
		type Container,
		containerOfType,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates,
		type StrategyContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

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
			...parts.map(({ revision }, index) => ({
				object: container.revision,
				position: index,
				predicate: predicates.enum['is-part-of-strategy'],
				subject: revision
			})),
			...container.relation.filter(
				({ predicate }) => predicate !== predicates.enum['is-part-of-strategy']
			)
		];
		await saveContainer({ ...container, relation });
		await invalidateAll();
	}

	function addChapterURL(url: URL, strategyRevision: number) {
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', String(strategyRevision));
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

			<EditableChapterType
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.chapterType}
			/>

			<EditableTopic
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.topic}
			/>

			<EditableCategory
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.category}
			/>

			<EditableAudience
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.audience}
			/>

			<EditableOwnedBy editable={$applicationState.containerDetailView.editable} bind:container />
		</svelte:fragment>

		<svelte:fragment slot="extra">
			<div class="chapters">
				{#each parts as part}
					<form class="chapter" on:submit|preventDefault={debouncedSave(part)} novalidate>
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
						<a class="button" href={addChapterURL($page.url, container.revision)}>
							<PlusSmall />
							{$_('chapter')}
						</a>
					{/if}
				{/each}
			</div>
		</svelte:fragment>
	</EditableContainerDetailView>
{:else if $applicationState.containerDetailView.mode === 'view_mode.table'}
	<div class="table">
		<div class="table-head">
			<div class="row">
				<div class="cell"></div>
				<div class="cell"></div>
				<div class="cell">{$_('fulfillment_date')}</div>
				<div class="cell">{$_('status')}</div>
				<div class="cell">{$_('object')}</div>
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
					on:submit|preventDefault={debouncedSave(part)}
					novalidate
				>
					<EditableRow container={part} editable={$applicationState.containerDetailView.editable} />
				</form>
			{/each}
		</div>
	</div>
{/if}

<style>
	.chapters {
		border-top: solid 1px var(--color-gray-300);
		padding-top: 1.5rem;
	}

	.chapter {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		max-width: 50rem;
	}

	.table {
		margin-left: calc(4rem - 1.25rem - 2rem);
		width: fit-content;
	}

	.table-body {
		color: inherit;
	}

	.table-head {
		background-color: transparent;
		position: sticky;
	}

	.table-head .cell {
		padding: 0.75rem 1rem;
	}

	.row {
		border: none;
	}
</style>
