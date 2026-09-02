<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import copyContainer from '$lib/client/copyContainer';
	import saveContainer from '$lib/client/saveContainer';
	import Badges from '$lib/components/Badges.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import NewContainerProperties from '$lib/components/NewContainerProperties.svelte';
	import {
		isContainer,
		isContainerWithBody,
		isContainerWithDescription,
		isContainerWithName,
		isContainerWithTitle,
		isOrganizationalUnitContainer,
		isSimpleMeasureContainer,
		type NewContainer,
		overlayKey,
		overlayURL
	} from '$lib/models';
	import { getToastContext } from '$lib/contexts/toast';
	import { addItemState, createContainerDialogState } from '$lib/stores';
	import AutoresizingTextarea from './AutoresizingTextarea.svelte';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();
	const toast = getToastContext();

	async function save(container: NewContainer) {
		const pendingCopy =
			$createContainerDialogState?.kind === 'copy'
				? $createContainerDialogState.request
				: undefined;
		const addItemTarget = $addItemState.target;
		const response = pendingCopy
			? await copyContainer({ ...pendingCopy, rootPayload: container.payload })
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
		$createContainerDialogState = undefined;
		$addItemState = {};
	}

	function handleSubmit(event: SubmitEvent) {
		if (!event.submitter) {
			event.preventDefault();
			return;
		}

		if (event.submitter.classList.contains('button-primary')) {
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
				<h2 id="create-container-dialog-title">
					{$_(
						$createContainerDialogState.kind === 'copy' &&
							$createContainerDialogState.request.operation === 'create-template'
							? 'create_container_dialog.template_title'
							: 'create_container_dialog.title'
					)}
				</h2>
				<div class="actions">
					<button class="button-alternative system-primary" formnovalidate type="submit">
						{$_('cancel')}
					</button>
					<button class="button-primary system-primary" type="submit">
						{$_('save')}
					</button>
				</div>
			</header>

			<div class="main">
				<div class="form-panel">
					<div class="title">
						<div class="title-field">
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
					</div>

					<div class="properties">
						<NewContainerProperties container={$createContainerDialogState.container} />
					</div>

					<div class="description">
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
					</div>
				</div>
			</div>
		</form>
	{/if}
</dialog>

<style>
	dialog {
		background-color: var(--color-surface-accent-container);
		border: 0.0625rem solid var(--color-border-raised);
		border-radius: 1.5rem;
		box-shadow: var(--shadow-2xl);
		height: min(47.5rem, calc(100vh - 2.5rem));
		max-height: none;
		max-width: none;
		overflow: hidden;
		padding: 0;
		width: min(80rem, calc(100vw - 2.5rem));
	}

	dialog::backdrop {
		backdrop-filter: blur(0.75rem);
		background: rgb(0 0 0 / 25%);
	}

	dialog > form {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		height: 100%;
		min-width: 0;
		width: 100%;
	}

	dialog > form > header {
		align-items: center;
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		padding: 1.5rem 1.5rem 1rem 2.25rem;
	}

	dialog > form > header h2 {
		color: var(--color-text-strong);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.25;
		margin: 0;
	}

	.actions {
		display: flex;
		flex-shrink: 0;
		gap: 0.25rem;
	}

	.actions button {
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		min-height: 2rem;
	}

	.main {
		min-height: 0;
		padding: 0 1.5rem 1.5rem;
	}

	.form-panel {
		background-color: var(--color-surface-default);
		border: 0.0625rem solid var(--color-border-subtle);
		border-radius: 1rem;
		color: var(--color-gray-500);
		container: details / inline-size;
		display: flex;
		flex-direction: column;
		font-size: 0.875rem;
		height: 100%;
		min-width: 0;
		overflow-y: auto;
		padding: 2rem 4rem;
		position: relative;
		width: 100%;
	}

	.title,
	.properties,
	.description {
		max-width: 50.0625rem;
		width: 100%;
	}

	.title {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
	}

	.title-field {
		border-radius: 0.5rem;
		color: var(--color-text-strong);
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.25;
		padding: 0.5rem;
	}

	.title-field:has(:global(textarea:invalid)) {
		background-color: var(--color-red-050);
		color: var(--color-red-500);
	}

	.title-field :global(textarea) {
		background: transparent;
		color: inherit;
	}

	.title-field :global(textarea::placeholder) {
		color: inherit;
		opacity: 1;
	}

	.properties,
	.description {
		--details-max-width: none;
		--details-padding-left: 0rem;
		--details-padding-right: 0rem;
		--details-section-padding-x: 0rem;
		--details-section-padding-y: 0rem;

		padding: 1.5rem;
	}
</style>
