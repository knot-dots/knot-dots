<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import EditableChapterType from '$lib/components/EditableChapterType.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableLevel from '$lib/components/EditableLevel.svelte';
	import EditableOwnedBy from '$lib/components/EditableOwnedBy.svelte';
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
			{#each relatedContainers
				.filter( ({ guid, relation }) => relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-strategy'] && guid != container.guid) )
				.filter(({ payload }) => byPayloadType(payload.type, $page.url)) as part}
				<EditableChapter
					container={part}
					editable={$applicationState.containerDetailView.editable}
					headingTag="h3"
					isPartOf={container}
					{relatedContainers}
				/>
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

<style>
	.chapters {
		border-top: solid 1px var(--color-gray-300);
		padding-top: 1.5rem;
	}
</style>
