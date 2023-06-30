<script lang="ts">
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import ContainerEditForm from '$lib/components/ContainerEditForm.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import { payloadTypes } from '$lib/models';
	import type {
		Container,
		ModifiedContainer,
		Payload,
		Status,
		SustainableDevelopmentGoal
	} from '$lib/models';
	import { user } from '$lib/stores.js';

	export let container: Container;
	export let relatedContainers: Container[];
	export let isPartOfOptions: Container[];

	const { getKeycloak } = getContext<KeycloakContext>(key);

	let edit = false;

	function closeOverlay() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		return `?${query.toString()}`;
	}

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);
		const indicatorContribution = new Map();

		for (let c of relatedContainers) {
			if (data.has(`indicatorContribution-${c.guid}`)) {
				indicatorContribution.set(c.guid, data.get(`indicatorContribution-${c.guid}`));
			}
		}

		const basePayload = {
			category: data.get('category') as SustainableDevelopmentGoal,
			description: data.get('description') as string,
			summary: data.get('summary') as string,
			title: data.get('title') as string,
			type: container.payload.type
		};

		let payload;

		if (container.payload.type === payloadTypes.enum.measure) {
			payload = {
				...basePayload,
				...(indicatorContribution.size > 0
					? { indicatorContribution: Object.fromEntries(indicatorContribution) }
					: undefined),
				status: data.get('status') as Status
			};
		} else if (container.payload.type === payloadTypes.enum.operational_goal) {
			payload = {
				...basePayload,
				...('indicator' in container.payload
					? { indicator: container.payload.indicator }
					: undefined)
			};
		} else if (container.payload.type === payloadTypes.enum.strategy) {
			payload = {
				...basePayload,
				...(data.has('level') ? { level: data.get('level') } : undefined),
				...(data.has('strategy-type') ? { strategyType: data.get('strategy-type') } : undefined),
				...(data.has('topic') ? { topic: data.get('topic') } : undefined)
			};
		} else {
			payload = basePayload;
		}

		const modifiedContainer: ModifiedContainer = {
			guid: container.guid,
			payload: payload as Payload,
			realm: env.PUBLIC_KC_REALM ?? '',
			relation: data
				.getAll('is-part-of')
				.map((v) => ({ predicate: 'is-part-of', object: Number(v) })),
			user: []
		};

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => null);
		const response = await fetch(`/container/${container.guid}/revision`, {
			method: 'POST',
			body: JSON.stringify(modifiedContainer),
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined),
				'Content-Type': 'application/json'
			}
		});

		await invalidateAll();
		edit = false;
	}
</script>

<div class="overlay" transition:slide={{ axis: 'x' }}>
	{#if edit}
		<ContainerEditForm {container} {isPartOfOptions} {relatedContainers} on:submit={handleSubmit}>
			<svelte:fragment slot="footer">
				<button id="save" class="primary">{$_('save')}</button>
				<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
			</svelte:fragment>
		</ContainerEditForm>
	{:else}
		<ContainerDetailView {container} {relatedContainers}>
			<svelte:fragment slot="header">
				<h2>{container.payload.title}</h2>
				<div class="icons">
					{#if $user.isAuthenticated}
						<button class="icons-element" on:click={() => (edit = true)}>
							<Icon solid src={Pencil} size="20" />
						</button>
					{/if}
					<a href={closeOverlay()} class="button icons-element">
						<Icon solid src={XMark} size="20" />
					</a>
				</div>
			</svelte:fragment>
		</ContainerDetailView>
	{/if}
</div>

<style>
	.overlay {
		height: calc(100%);
		margin-left: -0.375rem;
		overflow-x: hidden;
		padding: 0;
		width: 100%;
	}

	.overlay > :global(*) {
		min-width: 100vw;
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
