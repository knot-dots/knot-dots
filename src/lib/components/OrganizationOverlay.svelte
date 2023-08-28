<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import OrganizationForm from '$lib/components/OrganizationForm.svelte';
	import type { OrganizationContainer } from '$lib/models.js';
	import { sidebarToggle, user } from '$lib/stores';

	export let revisions: OrganizationContainer[];

	$: container = revisions[revisions.length - 1];

	let edit = false;

	function closeOverlay() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		query.delete('status');
		return `?${query.toString()}`;
	}

	async function afterSubmit() {
		await invalidateAll();
		edit = false;
	}

	async function afterDelete() {
		await goto(closeOverlay(), { invalidateAll: true });
	}
</script>

<div class="overlay" transition:slide={{ axis: 'x' }}>
	{#if edit}
		<OrganizationForm
			{container}
			on:deleteSuccessful={afterDelete}
			on:submitSuccessful={afterSubmit}
		>
			<svelte:fragment slot="extra-buttons">
				<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
			</svelte:fragment>
		</OrganizationForm>
	{:else}
		<ContainerDetailView {container} relatedContainers={[]} {revisions}>
			<svelte:fragment slot="header">
				<h2>
					{container.payload.name}
					<div class="icons">
						{#if $user.isAuthenticated}
							<button class="icons-element" on:click={() => (edit = true)}>
								<Icon solid src={Pencil} size="20" />
							</button>
						{/if}
						<a
							href={closeOverlay()}
							class="button icons-element"
							on:click={() => ($sidebarToggle = true)}
						>
							<Icon solid src={XMark} size="20" />
						</a>
					</div>
				</h2>
			</svelte:fragment>
		</ContainerDetailView>
	{/if}
</div>

<style>
	.overlay {
		height: calc(100%);
		margin-left: -1.5rem;
		overflow-x: hidden;
		padding: 0;
		width: 100%;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 80%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.8);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 65%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.65);
		}
	}
</style>
