<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import saveContainer from '$lib/client/saveContainer';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import OrganizationalUnitProperties from '$lib/components/OrganizationalUnitProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import {
		type AnyContainer,
		type Container,
		containerOfType,
		getOrganizationURL,
		type NewContainer,
		newContainer,
		type OrganizationalUnitContainer,
		isOrganizationalUnitContainer,
		organizationalUnitType,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import EditableCover from '$lib/components/EditableCover.svelte';
	import transformFileURL from '$lib/transformFileURL.js';
	import { backgroundColors } from '$lib/theme/models';
	import ColorDropdown from '$lib/components/ColorDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import Header from '$lib/components/Header.svelte';
	import type { Snippet } from 'svelte';
	import { env } from '$env/dynamic/public';

	interface Props {
		container: OrganizationalUnitContainer;
		layout: Snippet<[Snippet, Snippet]>;
		linkedProfiles?: AnyContainer[];
		relatedContainers?: Container[];
	}

	let {
		container = $bindable(),
		layout,
		linkedProfiles = [],
		relatedContainers: originalRelatedContainers = []
	}: Props = $props();

	let relatedContainers = $derived([container, ...originalRelatedContainers]);

	let w = $state(0);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	let mayEditStage = $derived(createFeatureDecisions(page.data.features).useStage());

	const handleSubmit = $derived(autoSave(container, 2000, container.payload.type));

	let isIndividualProfile = $derived(
		container.payload.organizationalUnitType ===
			organizationalUnitType.enum['organizational_unit_type.individual_profile']
	);

	let linkedProfile = $derived(
		linkedProfiles.filter(isOrganizationalUnitContainer).find((c) => c.guid !== container.guid)
	);

	let linkedProfileURL = $derived(
		linkedProfile ? getOrganizationURL(linkedProfile, '/all/page', env).toString() : undefined
	);

	let hasGeometry = $derived(Boolean(container.payload.geometry));

	let mayCreateIndividualProfile = $derived(
		hasGeometry &&
			!isIndividualProfile &&
			!linkedProfile &&
			$ability.can(
				'create',
				containerOfType(
					payloadTypes.enum.organizational_unit,
					container.organization,
					null,
					container.organization,
					container.realm
				)
			)
	);

	let creatingProfile = $state(false);

	async function createIndividualProfile() {
		creatingProfile = true;

		try {
			const profile: NewContainer = newContainer.parse({
				managed_by: container.organization,
				organization: container.organization,
				organizational_unit: null,
				payload: {
					...container.payload,
					organizationalUnitType:
						organizationalUnitType.enum['organizational_unit_type.individual_profile']
				},
				realm: container.realm,
				relation: [
					{
						object: container.guid,
						position: 0,
						predicate: predicates.enum['is-individual-profile-of']
					}
				]
			});

			const response = await saveContainer(profile);

			if (response.ok) {
				const created = await response.json();
				goto(getOrganizationURL(created, '/all/page', env).toString());
			} else {
				const err = await response.json();
				alert(err.message);
			}
		} finally {
			creatingProfile = false;
		}
	}
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	{#if container.payload.cover}
		<div class="cover-section">
			<img alt={$_('cover')} class="cover" src={transformFileURL(container.payload.cover)} />
		</div>
	{/if}
	<article>
		<div
			class="details stage stage--{container.payload.color
				? backgroundColors.get(container.payload.color)
				: 'white'}"
		>
			<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
				<div class="stage--buttons details-section">
					{#if mayEditStage}
						<EditableCover
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', container)}
							label={$_('add_cover')}
							bind:value={container.payload.cover}
						/>
						<ColorDropdown
							buttonStyle="button"
							bind:value={container.payload.color}
							label={$_('highlight')}
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', container)}
						/>
					{/if}
				</div>

				{#if linkedProfile}
					<div class="details-section profile-switch-wrapper">
						{#if linkedProfileURL}
							<div class="profile-switch" role="group" aria-label={$_('landing_page')}>
								{#if isIndividualProfile}
									<a class="profile-switch-item" href={linkedProfileURL}
										>{$_('standard_profile.title')}</a
									>
									<span aria-current="page" class="profile-switch-item profile-switch-item--active"
										>{$_('individual_profile.title')}</span
									>
								{:else}
									<span aria-current="page" class="profile-switch-item profile-switch-item--active"
										>{$_('standard_profile.title')}</span
									>
									<a class="profile-switch-item" href={linkedProfileURL}
										>{$_('individual_profile.title')}</a
									>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				<header class="details-section">
					<EditableLogo
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
						bind:value={container.payload.image}
					/>

					{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
						<h1
							class="details-title"
							contenteditable="plaintext-only"
							bind:textContent={container.payload.name}
							onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
						></h1>
					{:else}
						<h1 class="details-title" contenteditable="false">
							{container.payload.name}
						</h1>
					{/if}

					{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
						<button class="action-button" onclick={() => dialog.showModal()} type="button">
							<Ellipsis />
							<span class="is-visually-hidden">{$_('organizational_unit.properties.title')}</span>
						</button>
					{/if}
				</header>

				<PropertiesDialog
					bind:dialog
					{container}
					{relatedContainers}
					title={$_('organizational_unit.properties.title')}
				>
					{#snippet actions()}
						{#if mayCreateIndividualProfile}
							<button
								class="button button-xs button-alternative"
								disabled={creatingProfile}
								onclick={createIndividualProfile}
								type="button"
							>
								{$_('individual_profile.create')}
							</button>
						{/if}
					{/snippet}

					<OrganizationalUnitProperties
						bind:container
						editable={$ability.can('update', container)}
					/>
				</PropertiesDialog>

				{#if container.payload.organizationalUnitType !== organizationalUnitType.enum['organizational_unit_type.administrative_area']}
					{#key container.guid}
						<EditableFormattedText
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', container)}
							bind:value={container.payload.description}
						/>
					{/key}
				{/if}
			</form>
		</div>
		<div class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
			<Sections bind:container {relatedContainers} />
		</div>
	</article>
{/snippet}

{@render layout(header, main)}

<style>
	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.stage--buttons {
		min-height: 4rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	header button {
		margin-left: auto;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}

	.profile-switch-wrapper {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.profile-switch {
		align-items: center;
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 9999px;
		display: inline-flex;
		gap: 0.125rem;
		padding: 0.125rem;
	}

	.profile-switch-item {
		background: white;
		border-radius: 9999px;
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		padding: 0.5rem 1rem;
		text-decoration: none;
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}

	a.profile-switch-item:hover {
		background: white;
		color: var(--color-primary-700);
	}

	.profile-switch-item--active {
		background: var(--color-primary-700);
		color: white;
	}
</style>
