<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import copyContainer from '$lib/client/copyContainer';
	import saveContainer from '$lib/client/saveContainer';
	import Badges from '$lib/components/Badges.svelte';
	import CreateContainerTemplatePicker from '$lib/components/CreateContainerTemplatePicker.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import NewContainerProperties from '$lib/components/NewContainerProperties.svelte';
	import TemplateHierarchyPreview from '$lib/components/TemplateHierarchyPreview.svelte';
	import type { RootCopyPlacement, TemplateCopyPreview } from '$lib/containerCopy';
	import {
		isContainer,
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithTitle,
		isOrganizationalUnitContainer,
		isSimpleMeasureContainer,
		isStructuralCopyPredicate,
		type NewContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import createTemplateScopeSelection from '$lib/client/createTemplateScopeSelection.svelte';
	import { getToastContext } from '$lib/contexts/toast';
	import {
		addItemState,
		createContainerDialogState,
		type CreateContainerDialogState
	} from '$lib/stores';
	import AutoresizingTextarea from './AutoresizingTextarea.svelte';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();
	const toast = getToastContext();
	let templatePreview = $state<TemplateCopyPreview>();
	let pendingTemplateGuid = $state<string>();
	const templateScope = createTemplateScopeSelection(() => $createContainerDialogState?.container);
	let templateRequired = $derived(templateScope.required);
	let templateReady = $derived(
		templateScope.ready &&
			pendingTemplateGuid === undefined &&
			(!templateRequired ||
				($createContainerDialogState?.kind === 'copy' &&
					$createContainerDialogState.request.operation === 'template-instance'))
	);

	function activateTemplate(
		state: CreateContainerDialogState,
		preview: TemplateCopyPreview | undefined
	) {
		$createContainerDialogState = state;
		templatePreview = preview;
	}

	const showTemplatePicker = $derived.by(() => {
		const state = $createContainerDialogState;
		if (!state) return false;

		if ('template' in state.container.payload && state.container.payload.template) {
			return false;
		}

		return state.kind === 'create' || state.request.operation === 'template-instance';
	});

	function rootPlacementFor(container: NewContainer): RootCopyPlacement[] {
		return container.relation.flatMap(({ object, position, predicate, subject }) => {
			if (
				object === undefined ||
				(subject !== undefined && subject !== container.guid) ||
				!isStructuralCopyPredicate(predicate)
			) {
				return [];
			}
			return [{ parentGuid: object, position, predicate }];
		});
	}

	async function save(container: NewContainer) {
		const pendingCopy =
			$createContainerDialogState?.kind === 'copy'
				? $createContainerDialogState.request
				: undefined;
		const addItemTarget = $addItemState.target;
		let copyRequest = pendingCopy && { ...pendingCopy, rootPayload: container.payload };
		if (copyRequest?.operation === 'template-instance') {
			// A template instance is placed and managed like the empty object it replaces.
			copyRequest = {
				...copyRequest,
				rootPlacement: rootPlacementFor(container),
				targetManagedByGuid: container.managed_by[0]
			};
		}
		const response = copyRequest
			? await copyContainer(copyRequest)
			: await saveContainer(container);
		if (response.ok) {
			const savedContainer = await response.json();

			if (addItemTarget) {
				const items = addItemTarget.payload.item.includes(savedContainer.guid)
					? addItemTarget.payload.item
					: [...addItemTarget.payload.item, savedContainer.guid];
				const targetResponse = await saveContainer({
					...addItemTarget,
					payload: {
						...addItemTarget.payload,
						item: items
					}
				});

				if (!targetResponse.ok) {
					const error = await targetResponse.json();
					alert(error.message);
					return;
				}

				const savedTarget = await targetResponse.json();
				Object.assign(addItemTarget, savedTarget);
			}

			if (pendingCopy?.operation === 'create-template') {
				toast({
					heading: $_('toast.template_created.heading'),
					status: 'success'
				});
				return;
			}

			if (isOrganizationalUnitContainer(savedContainer)) {
				await goto(resolve('/[guid=uuid]', { guid: savedContainer.guid }), {
					invalidateAll: true
				});
			} else {
				await goto(overlayURL(page.url, overlayKey.enum.view, savedContainer.guid), {
					invalidateAll: true
				});
			}
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	function resetDialogState() {
		templatePreview = undefined;
		pendingTemplateGuid = undefined;
		$createContainerDialogState = undefined;
		$addItemState = {};
	}

	function handleSubmit(event: SubmitEvent) {
		if (!event.submitter) {
			event.preventDefault();
			return;
		}

		if (event.submitter.classList.contains('button-primary')) {
			if (!templateReady) {
				event.preventDefault();
				return;
			}
			if ($createContainerDialogState) {
				save($createContainerDialogState.container);
			}
		}

		dialog.close();
		resetDialogState();
	}
</script>

<dialog bind:this={dialog} onclose={resetDialogState}>
	{#if $createContainerDialogState}
		<form method="dialog" onsubmit={handleSubmit}>
			<header>
				<h2>
					{$_(
						$createContainerDialogState.kind === 'copy' &&
							$createContainerDialogState.request.operation === 'create-template'
							? 'create_container_dialog.template_title'
							: 'create_container_dialog.title'
					)}
				</h2>

				<button class="button-alternative system-primary" formnovalidate type="submit">
					{$_('cancel')}
				</button>

				<button class="button-primary system-primary" disabled={!templateReady} type="submit">
					{$_('save')}
				</button>
			</header>

			{#if templateReady}
				<article class="details">
					<div class="details-scroll-wrapper">
						<header class="details-section">
							<div class="details-header">
								<h1 class="details-title">
									{#if isContainerWithName($createContainerDialogState.container)}
										<AutoresizingTextarea
											aria-label={$_('title')}
											placeholder={$_('title')}
											required
											rows={1}
											bind:value={$createContainerDialogState.container.payload.name}
										/>
									{:else if isContainerWithTitle($createContainerDialogState.container)}
										<AutoresizingTextarea
											aria-label={$_('title')}
											placeholder={$_('title')}
											required
											rows={1}
											bind:value={$createContainerDialogState.container.payload.title}
										/>
									{/if}
								</h1>
							</div>

							{#if isContainer($createContainerDialogState.container)}
								<Badges bind:container={$createContainerDialogState.container} editable />
							{/if}

							{#if isSimpleMeasureContainer($createContainerDialogState.container)}
								<EditableProgress
									editable
									bind:value={$createContainerDialogState.container.payload.progress}
								/>
							{/if}
						</header>

						<NewContainerProperties bind:container={$createContainerDialogState.container} />

						{#if isContainerWithDescription($createContainerDialogState.container)}
							<EditableFormattedText
								editable
								label={$_('description')}
								bind:value={$createContainerDialogState.container.payload.description}
							/>
						{:else if isContainerWithBody($createContainerDialogState.container)}
							<EditableFormattedText
								editable
								label={$_('body')}
								bind:value={$createContainerDialogState.container.payload.body}
							/>
						{/if}

						{#if templatePreview}
							<TemplateHierarchyPreview preview={templatePreview} />
						{/if}
					</div>
				</article>
			{/if}

			{#if showTemplatePicker}
				<CreateContainerTemplatePicker
					scope={templateScope}
					bind:pendingTemplateGuid
					dialogState={$createContainerDialogState}
					onactivate={activateTemplate}
				/>
			{/if}
		</form>
	{/if}
</dialog>

<style>
	dialog {
		background-color: var(--color-surface-accent-container);
		border-radius: 12px;
		height: min(47.5rem, calc(100vh - 2.5rem));
		overflow: hidden;
		padding: 1.5rem;
		width: min(80rem, calc(100vw - 2.5rem));
	}

	dialog > form {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr minmax(0, auto);
		grid-template-rows: minmax(0, auto) 1fr;
		height: 100%;
		min-width: 0;
		width: 100%;
	}

	dialog > form > header {
		align-items: center;
		display: flex;
		gap: 1rem;
		grid-column: 1 / -1;
		padding: 0 0 0 0.75rem;
	}

	h2 {
		color: var(--color-text-strong);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.25;
		margin: 0 auto 0 0;
	}

	.details {
		--details-max-width: none;
		--details-padding-left: 3.5rem;
		--details-padding-right: 3.5rem;
		--details-padding-y: 1.5rem;

		background-color: var(--color-surface-default);
		border-radius: 16px;
	}

	.details-title {
		margin-bottom: 0.25rem;
		margin-left: -0.5rem;
		margin-right: -0.5rem;
	}

	.details-title :global(span::after),
	.details-title :global(textarea) {
		padding: 0.5rem;
	}

	.details-title :global(textarea:invalid) {
		background-color: var(--color-red-050);
	}

	.details-title :global(textarea::placeholder) {
		color: var(--color-red-500);
		opacity: 1;
	}
</style>
