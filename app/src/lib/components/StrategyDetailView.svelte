<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dragHandleZone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray-20-solid';
	import Pencil from '~icons/heroicons/pencil-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import autoSave from '$lib/client/autoSave';
	import saveContainer from '$lib/client/saveContainer';
	import Chapter from '$lib/components/Chapter.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import { containerOfType, paramsFromFragment, payloadTypes, predicates } from '$lib/models';
	import type { AnyContainer, Container, PayloadType, StrategyContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: AnyContainer[];

	$: parts = relatedContainers
		.filter(({ guid, relation }) =>
			relation.some(
				({ predicate }) =>
					predicate == predicates.enum['is-part-of-strategy'] && guid != container.guid
			)
		)
		.filter(({ payload }) => byPayloadType(payload.type, $page.url));

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

	function toggleEditMode() {
		applicationState.update((state) => ({
			...state,
			containerDetailView: {
				...state.containerDetailView,
				editable: !state.containerDetailView.editable
			}
		}));
	}

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
		await saveContainer({ ...container, relation });
		await invalidateAll();
	}
</script>

{#if $applicationState.containerDetailView.mode === 'view_mode.preview'}
	<ContainerDetailView {container} {relatedContainers} {revisions} tabs={[]}>
		<svelte:fragment slot="meta">
			<div class="meta">
				<h3 class="meta-key">{$_('level.label')}</h3>
				<p class="meta-value">{$_(container.payload.level)}</p>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(container.payload.strategyType)}</p>
			</div>

			{#if container.payload.pdf.length > 0}
				<div class="meta">
					<h3 class="meta-key">{$_('pdf')}</h3>
					<ul class="meta-value">
						{#each container.payload.pdf as pdf}
							<li>
								<a href={pdf[0]}>
									{pdf[1]}
									<ArrowDownTray />
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="extra">
			<div class="chapters">
				{#each parts as part}
					<Chapter container={part} headingTag="h3" isPartOf={container} {relatedContainers} />
				{:else}
					{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, $page.data.currentOrganization.guid, $page.data.currentOrganizationalUnit?.guid ?? null, container.managed_by, env.PUBLIC_KC_REALM))}
						<a class="button" href={addChapterURL($page.url, container.guid)}>
							<PlusSmall />
							{$_('chapter')}
						</a>
					{/if}
				{/each}
			</div>
		</svelte:fragment>
	</ContainerDetailView>
{:else if $applicationState.containerDetailView.mode === 'view_mode.table'}
	<article class="details">
		<div class="details-tab" id="basic-data">
			<h2 class="details-title">
				{container.payload.title}
				{#if $ability.can('update', container)}
					<button class="button button-square quiet" type="button" on:click={toggleEditMode}>
						<Pencil />
					</button>
				{/if}
			</h2>
		</div>
		<div class="details-tab" id="chapters">
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
	.chapters {
		border-top: solid 1px var(--color-gray-300);
		padding-top: 1.5rem;
	}

	.details-tab {
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
