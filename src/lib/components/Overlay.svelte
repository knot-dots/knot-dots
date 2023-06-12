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
	import IndicatorWizard from '$lib/components/IndicatorWizard.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type { Container } from '$lib/models.js';
	import { user } from '$lib/stores.js';
	import { status, sustainableDevelopmentGoals } from '$lib/models.js';
	import type { ContainerType, ModifiedContainer, SustainableDevelopmentGoal } from '$lib/models';

	export let containerPreviewData: Container;
	export let relationObjects: Container[];
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
		const modifiedContainer: ModifiedContainer = {
			guid: containerPreviewData.guid,
			payload: {
				category: data.get('category') as SustainableDevelopmentGoal,
				description: data.get('description') as string,
				summary: data.get('summary') as string,
				title: data.get('title') as string,
				...(data.has('status') ? { status: data.get('status') } : undefined),
				...('indicator' in containerPreviewData.payload
					? { indicator: containerPreviewData.payload.indicator }
					: undefined)
			},
			realm: env.PUBLIC_KC_REALM ?? '',
			relation: data
				.getAll('is-part-of')
				.map((v) => ({ predicate: 'is-part-of', object: Number(v) })),
			type: containerPreviewData.type as ContainerType,
			user: []
		};

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => null);
		const response = await fetch(`/container/${containerPreviewData.guid}/revision`, {
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
		<form class="details" method="POST" on:submit|preventDefault={handleSubmit}>
			<header>
				<label>
					{$_(containerPreviewData.type)}
					<input name="title" type="text" value={containerPreviewData.payload.title} required />
				</label>
			</header>

			<div class="details-content">
				<div class="details-content-column">
					<label>
						{$_('summary')}
						<textarea
							name="summary"
							maxlength="200"
							value={containerPreviewData.payload.summary ?? ''}
							required
						/>
					</label>
					<label>
						{$_('description')}
						<textarea
							name="description"
							value={containerPreviewData.payload.description}
							required
						/>
					</label>
					{#if 'indicator' in containerPreviewData.payload}
						<IndicatorWizard bind:indicator={containerPreviewData.payload.indicator} />
					{/if}
				</div>
				<div class="details-content-column">
					{#if 'status' in containerPreviewData.payload}
						<label>
							{$_('status.label')}
							<select name="status" required>
								{#each status.options as statusOption}
									<option
										selected={statusOption === containerPreviewData.payload.status}
										value={statusOption}
									>
										{$_(statusOption)}
									</option>
								{/each}
							</select>
						</label>
					{/if}
					<label>
						{$_('category')}
						<select name="category" required>
							<option label="" />
							{#each sustainableDevelopmentGoals.options as goal}
								<option selected={goal === containerPreviewData.payload.category} value={goal}>
									{$_(goal)}
								</option>
							{/each}
						</select>
					</label>
					{#if relationObjects}
						<RelationSelector
							{isPartOfOptions}
							containerType={containerPreviewData.type}
							selected={containerPreviewData.relation}
						/>
					{/if}
				</div>
			</div>

			<footer>
				<button id="save" class="primary">{$_('save')}</button>
				<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
			</footer>
		</form>
	{:else}
		<article class="details">
			<header>
				<h2>{containerPreviewData.payload.title}</h2>
				<div class="icons">
					{#if $user.isAuthenticated}
						<button class="quiet" on:click={() => (edit = true)}>
							<Icon solid src={Pencil} size="20" />
						</button>
					{/if}
					<a href={closeOverlay()} class="button quiet"><Icon solid src={XMark} size="20" /></a>
				</div>
			</header>

			<div class="details-content">
				<div class="details-content-column">
					<div class="summary">
						<h3>{$_('summary')}</h3>
						{containerPreviewData.payload.summary ?? ''}
					</div>
					<div class="description">
						<h3>{$_('description')}</h3>
						{containerPreviewData.payload.description}
					</div>
					{#if 'indicator' in containerPreviewData.payload}
						<div class="indicator">
							<h3>{$_('indicator.legend')}</h3>
							<ProgressBar
								fulfillmentDate={containerPreviewData.payload.indicator[0].fulfillmentDate}
								max={containerPreviewData.payload.indicator[0].max}
								min={containerPreviewData.payload.indicator[0].min}
								quantity={containerPreviewData.payload.indicator[0].quantity}
								value={containerPreviewData.payload.indicator[0].value}
							/>
						</div>
					{/if}
				</div>
				<div class="details-content-column">
					{#if 'status' in containerPreviewData.payload}
						<div class="meta">
							<h3 class="meta-key">{$_('status.label')}</h3>
							<p class="meta-value">{$_(containerPreviewData.payload.status)}</p>
						</div>
					{/if}
					<div class="meta">
						<h3 class="meta-key">{$_('category')}</h3>
						<ul class="meta-value">
							<li>{$_(containerPreviewData.payload.category)}</li>
						</ul>
					</div>
					{#if relationObjects}
						<div class="meta">
							<h3 class="meta-key">{$_('relations')}</h3>
							<ul class="meta-value">
								{#each relationObjects as { guid, payload, type }}
									<li>
										<a href="/{type}/{guid}">{payload.title}</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>

			<footer>
				<a class="button primary" href="/{containerPreviewData.type}/{containerPreviewData.guid}">
					{$_('read_more')}
				</a>
			</footer>
		</article>
	{/if}
</div>

<style>
	.overlay {
		height: calc(100%);
		margin-left: -1rem;
		overflow-x: hidden;
		padding: 0;
		width: 100%;
	}

	.overlay > * {
		min-width: 100vw;
	}

	.details-content {
		padding-bottom: 1.5rem;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 80%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.8);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 65%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.65);
		}
	}

	.details footer {
		border-top: 65vw;
	}
</style>
