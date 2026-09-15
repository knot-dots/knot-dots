<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resource } from 'runed';
	import { page } from '$app/state';
	import fetchContainerCopyPreview from '$lib/client/fetchContainerCopyPreview';
	import fetchContainers from '$lib/client/fetchContainers';
	import withOptimistic from '$lib/client/withOptimistic';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import type { TemplateCopyPreview } from '$lib/containerCopy';
	import {
		createTemplateInstanceOf,
		getAvailableInProgramGuids,
		getDirectProgramGuids,
		isProgramContainer,
		isTemplateContainer,
		isTemplateRoot,
		templatablePayloadTypes
	} from '$lib/models';
	import { isProgramScopedTemplateRoot, requiresProgramTemplate } from '$lib/programTemplates';
	import {
		lastCreatedContainers,
		lastDeletedContainers,
		lastUpdatedContainers,
		type CreateContainerDialogState
	} from '$lib/stores';

	const emptyChoiceKey = 'empty';

	type TemplateDraft = {
		preview: TemplateCopyPreview;
		state: CreateContainerDialogState;
	};
	interface Props {
		dialogState: CreateContainerDialogState;
		onactivate: (
			state: CreateContainerDialogState,
			preview: TemplateCopyPreview | undefined
		) => void;
		pendingTemplateGuid?: string;
	}

	let { dialogState, onactivate, pendingTemplateGuid = $bindable() }: Props = $props();

	const templatePayloadTypes = new Set<string>(templatablePayloadTypes);
	// Drafts are cached per template *and* program scope: the same template instantiated inside a
	// different program is a different request, so a scope change must not replay a stale draft.
	const templateDrafts = new Map<string, TemplateDraft>();
	let initialState = $state<Extract<CreateContainerDialogState, { kind: 'create' }>>();
	let activeChoiceKey = $state<string>(emptyChoiceKey);
	let selectionError = $state(false);

	function draftKey(templateGuid: string, programGuid: string | undefined) {
		return `${templateGuid}\u0000${programGuid ?? ''}`;
	}

	$effect(() => {
		if (!initialState && dialogState.kind === 'create') {
			initialState = dialogState;
		}
	});

	let enabled = $derived(
		initialState !== undefined && templatePayloadTypes.has(initialState.container.payload.type)
	);
	let directProgramGuids = $derived(
		initialState ? getDirectProgramGuids(initialState.container) : []
	);
	let required = $derived(initialState ? requiresProgramTemplate(initialState.container) : false);

	let availableIn = $derived.by(() => {
		const container = initialState?.container;
		if (!container) {
			return undefined;
		}

		if (directProgramGuids.length > 0) {
			return directProgramGuids.length === 1 ? directProgramGuids[0] : undefined;
		}

		const context = page.data.container;
		return context && isProgramContainer(context) ? context.guid : undefined;
	});

	const templatesResource = resource(
		[
			() => enabled,
			() => initialState?.container.payload.type,
			() => page.data.currentOrganization.guid,
			() => availableIn,
			() => directProgramGuids.length
		],
		async (
			[selectionEnabled, payloadType, organizationGuid, programGuid, programCount],
			previous,
			{ signal }
		) => {
			if (!selectionEnabled || !payloadType || programCount > 1) {
				return { availableIn: programGuid, templates: [] };
			}

			const templates = await fetchContainers(
				{
					availableIn: programGuid,
					organization: [organizationGuid],
					payloadType: [payloadType],
					template: 'true',
					templateRoot: true
				},
				'alpha',
				{ signal }
			);

			return {
				availableIn: programGuid,
				templates: templates.filter(isTemplateContainer).filter(isTemplateRoot)
			};
		}
	);

	function matchesCurrentScope(container: Parameters<typeof isTemplateContainer>[0]) {
		if (!initialState || container.organization !== page.data.currentOrganization.guid) {
			return false;
		}
		if (container.payload.type !== initialState.container.payload.type) {
			return false;
		}
		if (availableIn) {
			return isProgramScopedTemplateRoot(container, {
				organizationGuid: page.data.currentOrganization.guid,
				payloadType: initialState.container.payload.type,
				programGuid: availableIn
			});
		}
		return (
			isTemplateContainer(container) &&
			isTemplateRoot(container) &&
			getAvailableInProgramGuids(container).length === 0
		);
	}

	let templateRoots = $derived.by(() => {
		const loaded =
			templatesResource.current?.availableIn === availableIn
				? (templatesResource.current?.templates ?? [])
				: [];
		return withOptimistic(
			loaded,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers,
			matchesCurrentScope
		)
			.filter(isTemplateContainer)
			.filter(isTemplateRoot)
			.filter(matchesCurrentScope);
	});

	const previewResource = resource(
		[() => pendingTemplateGuid, () => availableIn],
		async ([sourceGuid, programGuid], previous, { signal }) => {
			if (!sourceGuid) {
				return undefined;
			}

			return {
				availableIn: programGuid,
				preview: await fetchContainerCopyPreview(
					{ availableIn: programGuid ?? null, sourceGuid },
					{ signal }
				),
				sourceGuid
			};
		}
	);

	function failTemplateSelection() {
		activeChoiceKey = emptyChoiceKey;
		pendingTemplateGuid = undefined;
		selectionError = true;
		if (initialState) {
			onactivate(initialState, undefined);
		}
	}

	function activateTemplateDraft(templateGuid: string, templatePreview: TemplateCopyPreview) {
		const key = draftKey(templateGuid, availableIn);
		let draft = templateDrafts.get(key);
		const template = templateRoots.find(({ guid }) => guid === templateGuid);
		if (!draft && template && initialState) {
			const container = createTemplateInstanceOf(
				template,
				initialState.container.organization,
				initialState.container.organizational_unit
			);
			container.managed_by = $state.snapshot(initialState.container.managed_by);
			container.realm = initialState.container.realm;
			container.relation = $state.snapshot(initialState.container.relation);
			draft = {
				preview: templatePreview,
				state: {
					kind: 'copy',
					container,
					request: {
						operation: 'template-instance',
						availableIn: availableIn ?? null,
						sourceGuid: template.guid,
						targetOrganizationGuid: initialState.container.organization,
						targetOrganizationalUnitGuid: initialState.container.organizational_unit
					}
				}
			};
			templateDrafts.set(key, draft);
		}
		if (!draft) {
			failTemplateSelection();
			return;
		}

		activeChoiceKey = templateGuid;
		pendingTemplateGuid = undefined;
		selectionError = false;
		onactivate(draft.state, draft.preview);
	}

	function selectTemplate(templateGuid: string) {
		if (templatesResource.loading || !templateRoots.some(({ guid }) => guid === templateGuid)) {
			return;
		}
		selectionError = false;
		const cachedDraft = templateDrafts.get(draftKey(templateGuid, availableIn));
		if (cachedDraft) {
			activateTemplateDraft(templateGuid, cachedDraft.preview);
			return;
		}

		pendingTemplateGuid = templateGuid;
	}

	function selectEmptyChoice() {
		if (!initialState || required) {
			return;
		}

		activeChoiceKey = emptyChoiceKey;
		pendingTemplateGuid = undefined;
		selectionError = false;
		onactivate(initialState, undefined);
	}

	function clearTemplateSelection() {
		if (!initialState) {
			return;
		}

		activeChoiceKey = emptyChoiceKey;
		pendingTemplateGuid = undefined;
		selectionError = false;
		onactivate(initialState, undefined);
	}

	$effect(() => {
		const result = previewResource.current;
		if (
			!templatesResource.loading &&
			result &&
			result.sourceGuid === pendingTemplateGuid &&
			result.availableIn === availableIn
		) {
			activateTemplateDraft(result.sourceGuid, result.preview);
		}
	});

	$effect(() => {
		if (previewResource.error && pendingTemplateGuid) {
			failTemplateSelection();
		}
	});

	// A scope change invalidates the active request immediately. Within the same scope, wait for
	// discovery to settle before removing a selection that is no longer offered.
	$effect(() => {
		if (
			activeChoiceKey !== emptyChoiceKey &&
			((dialogState.kind === 'copy' &&
				dialogState.request.operation === 'template-instance' &&
				dialogState.request.availableIn !== (availableIn ?? null)) ||
				(!templatesResource.loading && !templateRoots.some(({ guid }) => guid === activeChoiceKey)))
		) {
			clearTemplateSelection();
		}
	});

	let selectedChoiceKey = $derived(pendingTemplateGuid ?? activeChoiceKey);
	let templateSelected = $derived(
		activeChoiceKey !== emptyChoiceKey &&
			dialogState.kind === 'copy' &&
			dialogState.request.operation === 'template-instance' &&
			dialogState.request.sourceGuid === activeChoiceKey
	);
</script>

{#if enabled || required}
	{#if required && (!templateSelected || pendingTemplateGuid !== undefined)}
		<article class="template-prompt" aria-live="polite">
			{#if !enabled || directProgramGuids.length !== 1}
				<p>{$_('create_container_dialog.no_templates')}</p>
			{:else if templatesResource.loading || pendingTemplateGuid !== undefined}
				<p>{$_('loading')}</p>
			{:else if templatesResource.error || selectionError}
				<p>{$_('create_container_dialog.template_load_error')}</p>
			{:else if templateRoots.length === 0}
				<p>{$_('create_container_dialog.no_templates')}</p>
			{:else}
				<p>{$_('create_container_dialog.select_template')}</p>
			{/if}
		</article>
	{/if}

	<aside aria-label={$_('create_container_dialog.templates')}>
		{#if !required}
			<label class="without-template">
				<input
					checked={selectedChoiceKey === emptyChoiceKey}
					class="is-visually-hidden"
					name="create-container-template"
					type="radio"
					value={emptyChoiceKey}
					onchange={selectEmptyChoice}
				/>
				<strong>{$_('create_container_dialog.without_template')}</strong>
				<span>{$_('create_container_dialog.without_template_description')}</span>
			</label>
		{/if}
		{#each templateRoots as template (template.guid)}
			<SelectableCard
				checked={selectedChoiceKey === template.guid}
				container={template}
				inputType="radio"
				name="create-container-template"
				onchange={() => selectTemplate(template.guid)}
			/>
		{/each}

		{#if !required && (templatesResource.loading || pendingTemplateGuid !== undefined)}
			<p aria-live="polite">{$_('loading')}</p>
		{:else if !required && (templatesResource.error || selectionError)}
			<p class="error" aria-live="polite">
				{$_('create_container_dialog.template_load_error')}
			</p>
		{/if}
	</aside>
{/if}

<style>
	.template-prompt {
		align-items: center;
		background-color: var(--color-surface-default);
		border-radius: 16px;
		display: flex;
		justify-content: center;
		padding: 2rem;
		text-align: center;
	}

	.template-prompt p {
		margin: 0;
	}

	aside {
		overflow-y: auto;
		width: 18.75rem;
	}

	aside > :global(*) {
		margin-bottom: 0.5rem;
	}

	.without-template {
		background: var(--color-surface-default);
		border: 0.0625rem solid var(--color-border-subtle);
		border-radius: 0.5rem;
		cursor: pointer;
		display: grid;
		gap: 0.25rem;
		padding: 1rem;
		width: 100%;
	}

	.without-template:hover {
		background: var(--color-surface-accent-container);
	}

	.without-template:has(input:checked) {
		border-color: var(--color-primary-700);
		box-shadow: inset 0 0 0 0.0625rem var(--color-primary-700);
	}

	.without-template strong {
		color: var(--color-text-strong);
		font-size: 0.875rem;
	}

	.without-template span,
	p {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		margin: 0;
	}

	.error {
		color: var(--color-red-500);
	}
</style>
