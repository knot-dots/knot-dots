<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Pencil from '~icons/heroicons/pencil-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import Card from '$lib/components/Card.svelte';
	import ObjectiveCarousel from '$lib/components/ObjectiveCarousel.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import TaskCarousel from '$lib/components/TaskCarousel.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		type AnyContainer,
		type Container,
		type ContainerDetailViewTabKey,
		type ContainerWithEffect,
		displayName,
		getCreator,
		getManagedBy,
		isAdminOf,
		isContainerWithObjective,
		isEffectContainer,
		isHeadOf,
		isMeasureContainer,
		isPartOf,
		isStrategyContainer,
		overlayKey,
		owners,
		paramsFromFragment,
		payloadTypes,
		predicates,
		type User
	} from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';
	import { ability, addEffectState, applicationState, mayCreateContainer } from '$lib/stores';

	export let container: Container;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
	export let tabs: ContainerDetailViewTabKey[] = ['basic-data', 'metadata'];

	applicationState.update((state) => ({
		...state,
		containerDetailView: { ...state.containerDetailView, tabs }
	}));

	$: strategy = isStrategyContainer(container)
		? container
		: relatedContainers
				.filter(isStrategyContainer)
				.find(
					(candidate) =>
						container.relation.findIndex(
							(r) =>
								r.predicate === predicates.enum['is-part-of-strategy'] &&
								r.object === candidate.guid &&
								candidate.guid !== container.guid
						) > -1
				);

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers
				.filter(isMeasureContainer)
				.find(
					(candidate) =>
						container.relation.findIndex(
							(r) =>
								r.predicate === predicates.enum['is-part-of-measure'] &&
								r.object === candidate.guid &&
								candidate.guid !== container.guid
						) > -1
				);

	$: effect = relatedContainers.filter(isEffectContainer).find(isPartOf(container));

	async function addEffect(target: Container, measure: ContainerWithEffect) {
		const params = new URLSearchParams([
			[overlayKey.enum.create, payloadTypes.enum.indicator],
			['alreadyInUse', '']
		]);

		for (const category of measure.payload.category) {
			params.append('category', category);
		}

		for (const topic of measure.payload.topic) {
			params.append('topic', topic);
		}

		for (const measureType of measure.payload.measureType) {
			params.append('measureType', measureType);
		}

		$addEffectState = { target };

		await goto(`#${params.toString()}`);
	}

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = paramsFromFragment($page.url);
			query.set(overlayKey.enum.view, guid);
			return `#${query.toString()}`;
		}
	}

	let organizationMembersRequest: Promise<User[]> = new Promise(() => []);

	$: organizationMembersRequest = fetchMembers(container.organization);

	$: managedBy = getManagedBy(container, [
		...$page.data.organizations,
		...$page.data.organizationalUnits,
		...relatedContainers
	]);
</script>

<article class="details">
	<div class="details-tab" id="basic-data">
		<h2 class="details-title">
			{container.payload.title}
			{#if $ability.can('update', container)}
				<a class="button button-square quiet" href="#view={container.guid}&edit">
					<Pencil />
				</a>
			{/if}
		</h2>

		<slot name="data">
			{#if 'summary' in container.payload || 'description' in container.payload}
				<div class="summary">
					<h3>{$_('summary')}</h3>
					<Summary {container} />
				</div>
			{/if}

			{#if 'description' in container.payload}
				<div class="description">
					<h3>{$_('description')}</h3>
					<Viewer value={container.payload.description} />
				</div>
			{/if}

			{#if measure && (effect || $mayCreateContainer(payloadTypes.enum.effect, container.managed_by))}
				<div class="effect">
					<h3>{$_('effect')}</h3>
					{#if effect}
						<Card container={effect} {relatedContainers} />
					{:else}
						<button type="button" on:click={() => addEffect(container, measure)}>
							<PlusSmall />{$_('add_item')}
						</button>
					{/if}
				</div>
			{/if}

			{#if strategy && isContainerWithObjective(container)}
				<div class="indicator-objective">
					<h3>{$_('objectives')}</h3>
					<ObjectiveCarousel {container} {relatedContainers} />
				</div>
			{/if}

			{#if 'progress' in container.payload}
				<div class="progress">
					<h3>{$_('progress')}</h3>
					<Progress value={container.payload.progress} />
				</div>
			{/if}

			{#if isContainerWithObjective(container)}
				<TaskCarousel {container} />
			{/if}

			{#if 'body' in container.payload}
				<div class="body">
					<h3>{$_('Body')}</h3>
					<Viewer value={container.payload.body} />
				</div>
			{/if}
		</slot>
	</div>

	<div class="details-tab" id="metadata">
		{#if 'goalType' in container.payload && container.payload.goalType}
			<div class="meta">
				<h3 class="meta-key">{$_('goal_type')}</h3>
				<p class="meta-value">{$_(container.payload.goalType)}</p>
			</div>
		{/if}

		<slot name="meta">
			{#if 'fulfillmentDate' in container.payload && container.payload.fulfillmentDate}
				<div class="meta">
					<h3 class="meta-key">{$_('fulfillment_date')}</h3>
					<p class="meta-value">
						{$date(new Date(container.payload.fulfillmentDate), { format: 'medium' })}
					</p>
				</div>
			{/if}

			{#if strategy}
				<div class="meta">
					<h3 class="meta-key">{$_('strategy')}</h3>
					<p class="meta-value">
						{#if $page.url.pathname === `/strategy/${strategy.guid}`}
							{$_(strategy.payload.title)}
						{:else}
							<a href={containerURL(strategy.payload.type, strategy.guid)}>
								{$_(strategy.payload.title)}
							</a>
						{/if}
					</p>
				</div>
				<div class="meta">
					<h3 class="meta-key">{$_('strategy_type.label')}</h3>
					<p class="meta-value">{$_(strategy.payload.strategyType)}</p>
				</div>
			{/if}

			{#if measure}
				<div class="meta">
					<h3 class="meta-key">{$_('measure')}</h3>
					<p class="meta-value">
						<a href={containerURL(measure.payload.type, measure.guid)}>
							{$_(measure.payload.title)}
						</a>
					</p>
				</div>
			{/if}
		</slot>

		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>

		{#if 'topic' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('topic')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each container.payload.topic as topic}
						<li>{$_(topic)}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if 'policyFieldBNK' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('policy_field_bnk')}</h3>
				<ul class="meta-value meta-value--policy-field-bnk">
					{#each container.payload.policyFieldBNK as policyFieldBNK}
						<li>{$_(policyFieldBNK)}</li>
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

		<div class="meta">
			<h3 class="meta-key">{$_('owned_by')}</h3>
			<ul class="meta-value">
				{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
					<li>{owner.payload.name}</li>
				{/each}
			</ul>
		</div>

		{#if managedBy}
			<div class="meta">
				<h3 class="meta-key">{$_('managed_by')}</h3>
				{#await fetchMembers(managedBy.guid) then members}
					{@const headsOf = members
						.filter((m) => isHeadOf(m, managedBy))
						.map((m) => displayName(m))
						.join(', ')}
					{@const adminsOf = members
						.filter((m) => isAdminOf(m, managedBy))
						.map((m) => displayName(m))
						.join(', ')}
					<p class="meta-value">{headsOf ? headsOf : adminsOf}</p>
				{/await}
			</div>
		{/if}

		<div class="meta">
			<h3 class="meta-key">{$_('created_date')}</h3>
			{#await organizationMembersRequest then organizationMembers}
				{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
				<ul class="meta-value">
					<li>
						{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: revisions[0].valid_from,
										creator: getCreator(revisions[0])
											.map((guid) => organizationMembersByGuid.get(guid))
											.filter((m) => m !== undefined)
											.map((m) => displayName(m))
											.join(', ')
									}
								})
							: $date(revisions[0].valid_from, { format: 'long' })}
					</li>
				</ul>
			{/await}
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('modified_date')}</h3>
			{#await organizationMembersRequest then organizationMembers}
				{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
				<ul class="meta-value">
					<li>
						{getCreator(container).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: container.valid_from,
										creator: getCreator(container)
											.map((guid) => organizationMembersByGuid.get(guid))
											.filter((m) => m !== undefined)
											.map((m) => displayName(m))
											.join(', ')
									}
								})
							: $date(container.valid_from, { format: 'long' })}
					</li>
				</ul>
			{/await}
		</div>

		{#if $ability.can('read', container, 'visibility')}
			<div class="meta">
				<h3 class="meta-key">{$_('visible_for')}</h3>
				<ul class="meta-value">
					<li>{$_(`visibility.${container.payload.visibility}`)}</li>
				</ul>
			</div>
		{/if}
	</div>

	<slot name="extra" />
</article>
