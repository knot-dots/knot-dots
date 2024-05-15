<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray-20-solid';
	import Pencil from '~icons/heroicons/pencil-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import fetchMembers from '$lib/client/fetchMembers';
	import Chapter from '$lib/components/Chapter.svelte';
	import {
		containerOfType,
		getCreator,
		owners,
		paramsFromFragment,
		payloadTypes,
		type User
	} from '$lib/models';
	import type { AnyContainer, Container, PayloadType, StrategyContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import { sdgIcons } from '$lib/theme/models';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: AnyContainer[];

	function addChapterURL(url: URL, strategyRevision: number) {
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', String(strategyRevision));
		return `#${params.toString()}`;
	}

	function byPayloadType(payloadType: PayloadType, url: URL) {
		const params = paramsFromFragment(url);
		return !params.has('payloadType') || params.getAll('payloadType').includes(payloadType);
	}

	let organizationMembersRequest: Promise<User[]> = new Promise(() => []);

	$: organizationMembersRequest = fetchMembers(container.organization);
</script>

<article class="details">
	<h2 class="details-title">
		{container.payload.title}
		{#if $ability.can('update', container)}
			<a class="button button-square quiet" href="#view={container.guid}&edit">
				<Pencil />
			</a>
		{/if}
	</h2>

	<div class="meta">
		<h3 class="meta-key">{$_('object')}</h3>
		<p class="meta-value">{$_(container.payload.type)}</p>
	</div>
	<div class="meta">
		<h3 class="meta-key">{$_('strategy_type.label')}</h3>
		<p class="meta-value">{$_(container.payload.strategyType)}</p>
	</div>
	{#if 'topic' in container.payload}
		<div class="meta">
			<h3 class="meta-key">{$_('topic.label')}</h3>
			<ul class="meta-value meta-value--topic">
				{#each container.payload.topic as topic}
					<li>{$_(topic)}</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#if 'category' in container.payload}
		<div class="meta">
			<h3 class="meta-key">{$_('category')}</h3>
			<ul class="meta-value meta-value--category">
				{#each container.payload.category as category}
					<li>
						<img
							src={sdgIcons.get(category)}
							alt={$_(category)}
							title={$_(category)}
							width="66"
							height="66"
						/>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	<div class="meta">
		<h3 class="meta-key">{$_('level.label')}</h3>
		<p class="meta-value">{$_(container.payload.level)}</p>
	</div>
	<div class="meta">
		<h3 class="meta-key">{$_('owned_by')}</h3>
		<ul class="meta-value">
			{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
				<li>{owner.payload.name}</li>
			{/each}
		</ul>
	</div>
	{#if 'audience' in container.payload}
		<div class="meta">
			<h3 class="meta-key">{$_('audience')}</h3>
			<ul class="meta-value">
				{#each container.payload.audience as audience}
					<li>{$_(audience)}</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#if container.payload.pdf}
		<div class="meta">
			<h3 class="meta-key">{$_('pdf')}</h3>
			<p class="meta-value meta-value-pdf">
				<a href={container.payload.pdf}>
					{$_('download')}
					<ArrowDownTray />
				</a>
			</p>
		</div>
	{/if}
	{#await organizationMembersRequest then organizationMembers}
		{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
		<div class="meta">
			<h3 class="meta-key">{$_('created_date')}</h3>
			<ul class="meta-value">
				<li>
					{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
						? $_('created_by', {
								values: {
									date: revisions[0].valid_from,
									creator: getCreator(revisions[0])
										.filter((guid) => organizationMembersByGuid.has(guid))
										.map((guid) => organizationMembersByGuid.get(guid)?.display_name)
										.join(', ')
								}
							})
						: $date(revisions[0].valid_from, { format: 'long' })}
				</li>
			</ul>
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('modified_date')}</h3>
			<ul class="meta-value">
				<li>
					{getCreator(container).some((guid) => organizationMembersByGuid.has(guid))
						? $_('created_by', {
								values: {
									date: container.valid_from,
									creator: getCreator(container)
										.filter((guid) => organizationMembersByGuid.has(guid))
										.map((guid) => organizationMembersByGuid.get(guid)?.display_name)
										.join(', ')
								}
							})
						: $date(container.valid_from, { format: 'long' })}
				</li>
			</ul>
		</div>
	{/await}

	<div class="chapters">
		{#each relatedContainers.filter( ({ payload }) => byPayloadType(payload.type, $page.url) ) as part}
			<Chapter container={part} headingTag="h3" isPartOf={container} />
		{:else}
			{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, $page.data.currentOrganization.guid, $page.data.currentOrganizationalUnit?.guid ?? null, env.PUBLIC_KC_REALM))}
				<a class="button" href={addChapterURL($page.url, container.revision)}>
					<PlusSmall />
					{$_('chapter')}
				</a>
			{/if}
		{/each}
	</div>
</article>

<style>
	.chapters {
		border-top: solid 1px var(--color-gray-300);
		padding-top: 1.5rem;
	}
</style>
