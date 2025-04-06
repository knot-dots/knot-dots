<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import autoSave from '$lib/client/autoSave';
	import fetchMembers from '$lib/client/fetchMembers';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import {
		type AnyContainer,
		type Container,
		type ContainerDetailViewTabKey,
		displayName,
		getCreator,
		getManagedBy,
		isAdminOf,
		isContainerWithProgress,
		isHeadOf
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: Container;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
	export let tabs: ContainerDetailViewTabKey[] = ['basic-data', 'metadata'];

	applicationState.update((state) => ({
		...state,
		containerDetailView: { ...state.containerDetailView, tabs }
	}));

	$: managedBy = getManagedBy(container, [
		...$page.data.organizations,
		...$page.data.organizationalUnits,
		...relatedContainers
	]) as AnyContainer;

	$: managedByGuid = managedBy.guid;

	$: teamPromise = fetchMembers(managedByGuid);

	$: organization = container.organization;

	$: organizationMembersPromise = fetchMembers(organization);

	let timer: ReturnType<typeof setTimeout>;

	function debouncedSubmit(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			input.closest('form')?.requestSubmit();
		}, 2000);
	}
</script>

<form on:submit|preventDefault={autoSave(container)} novalidate>
	<article class="details details-editable">
		<div class="details-tab" id="basic-data">
			{#if $applicationState.containerDetailView.editable}
				<h2
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.title}
					on:keydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
					on:input={debouncedSubmit}
				></h2>
			{:else}
				<h2 class="details-title" contenteditable="false">
					{container.payload.title}
				</h2>
			{/if}

			{#if isContainerWithProgress(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.progress}
					compact
				/>
			{/if}

			<p class="section-label" id="properties-label">{$_('properties')}</p>
			<section class="data-grid" aria-labelledby="properties-label">
				<slot name="data" />

				<div class="label">{$_('managed_by')}</div>
				<div class="value">
					{#await teamPromise}
						&nbsp;
					{:then members}
						{@const headsOf = members
							.filter((m) => isHeadOf(m, managedBy))
							.map((m) => displayName(m))
							.join(', ')}
						{@const adminsOf = members
							.filter((m) => isAdminOf(m, managedBy))
							.map((m) => displayName(m))
							.join(', ')}
						{#if headsOf}{headsOf}{:else if adminsOf}{adminsOf}{:else}&nbsp;{/if}
					{/await}
				</div>

				<div class="label">{$_('created_date')}</div>
				<div class="value">
					{#await organizationMembersPromise}
						{$date(revisions[0].valid_from, { format: 'long' })}
					{:then organizationMembers}
						{@const organizationMembersByGuid = new Map(
							organizationMembers.map((m) => [m.guid, m])
						)}
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
					{/await}
				</div>

				<div class="label">{$_('modified_date')}</div>
				<div class="value">
					{#await organizationMembersPromise}
						{$date(container.valid_from, { format: 'long' })}
					{:then organizationMembers}
						{@const organizationMembersByGuid = new Map(
							organizationMembers.map((m) => [m.guid, m])
						)}
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
					{/await}
				</div>
			</section>
		</div>

		<slot name="extra" />
	</article>
</form>

<style>
	.section-label {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 1.5rem 0 1rem;
	}
</style>
