<script lang="ts">
	import { _, date, number } from 'svelte-i18n';
	import Pencil from '~icons/heroicons/pencil-solid';
	import { page } from '$app/stores';
	import {
		type AnyContainer,
		getCreator,
		isMeasureContainer,
		overlayKey,
		overlayURL,
		owners
	} from '$lib/models';
	import type { Container, ResourceContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import fetchMembers from '$lib/client/fetchMembers';

	export let container: ResourceContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({
		...state,
		containerDetailView: { tabs: [] }
	}));

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers.find(isMeasureContainer);

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

	<div class="details-tab" id="basic-data">
		<div class="amount">
			<h3>{$_('amount')}</h3>
			<p>{$number(container.payload.amount)} {container.payload.unit}</p>
		</div>

		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>

		{#if measure}
			<div class="meta">
				<h3 class="meta-key">{$_('measure')}</h3>
				<p class="meta-value">
					<a href={overlayURL($page.url, overlayKey.enum.view, measure.guid)}>
						{$_(measure.payload.title)}
					</a>
				</p>
			</div>
		{/if}

		<div class="meta">
			<h3 class="meta-key">{$_('fulfillment_date')}</h3>
			<p class="meta-value">
				{$date(new Date(container.payload.fulfillmentDate), { format: 'medium' })}
			</p>
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
	</div>
</article>
