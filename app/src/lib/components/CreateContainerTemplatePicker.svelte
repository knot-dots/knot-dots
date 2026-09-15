<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resource } from 'runed';
	import { page } from '$app/state';
	import fetchContainerCopyPreview from '$lib/client/fetchContainerCopyPreview';
	import fetchContainers from '$lib/client/fetchContainers';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import type { TemplateCopyPreview } from '$lib/containerCopy';
	import {
		createTemplateInstanceOf,
		isProgramContainer,
		isTemplateContainer,
		isTemplateRoot,
		predicates,
		templatablePayloadTypes
	} from '$lib/models';
	import type { CreateContainerDialogState } from '$lib/stores';

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
		onpendingchange: (pending: boolean) => void;
	}

	let { dialogState, onactivate, onpendingchange }: Props = $props();

	const templatePayloadTypes = new Set<string>(templatablePayloadTypes);
	// Drafts are cached per template *and* program scope: the same template instantiated inside a
	// different program is a different request, so a scope change must not replay a stale draft.
	const templateDrafts = new Map<string, TemplateDraft>();
	let initialState = $state<Extract<CreateContainerDialogState, { kind: 'create' }>>();
	let activeChoiceKey = $state<string>(emptyChoiceKey);
	let pendingTemplateGuid = $state<string>();
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

	let availableIn = $derived.by(() => {
		const container = initialState?.container;
		if (!container) {
			return undefined;
		}

		const placement = container.relation.find(
			({ object, predicate, subject }) =>
				predicate === predicates.enum['is-part-of-program'] &&
				object !== undefined &&
				(subject === undefined || subject === container.guid)
		);
		if (placement?.object) {
			return placement.object;
		}

		const context = page.data.container;
		return context && isProgramContainer(context) ? context.guid : undefined;
	});

	const templatesResource = resource(
		[
			() => enabled,
			() => initialState?.container.payload.type,
			() => page.data.currentOrganization.guid,
			() => availableIn
		],
		async (
			[selectionEnabled, payloadType, organizationGuid, programGuid],
			previous,
			{ signal }
		) => {
			if (!selectionEnabled || !payloadType) {
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

	let templateRoots = $derived(
		templatesResource.current?.availableIn === availableIn
			? (templatesResource.current?.templates ?? [])
			: []
	);

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
			pendingTemplateGuid = undefined;
			selectionError = true;
			onpendingchange(false);
			return;
		}

		activeChoiceKey = templateGuid;
		pendingTemplateGuid = undefined;
		selectionError = false;
		onpendingchange(false);
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
		onpendingchange(true);
	}

	function selectEmptyChoice() {
		if (!initialState) {
			return;
		}

		activeChoiceKey = emptyChoiceKey;
		pendingTemplateGuid = undefined;
		selectionError = false;
		onpendingchange(false);
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
			pendingTemplateGuid = undefined;
			selectionError = true;
			onpendingchange(false);
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
			selectEmptyChoice();
		}
	});

	let selectedChoiceKey = $derived(pendingTemplateGuid ?? activeChoiceKey);
</script>

{#if enabled}
	<aside aria-label={$_('create_container_dialog.templates')}>
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
		{#each templateRoots as template (template.guid)}
			<SelectableCard
				checked={selectedChoiceKey === template.guid}
				container={template}
				inputType="radio"
				name="create-container-template"
				onchange={() => selectTemplate(template.guid)}
			/>
		{/each}

		{#if templatesResource.loading || pendingTemplateGuid !== undefined}
			<p aria-live="polite">{$_('loading')}</p>
		{:else if templatesResource.error || selectionError}
			<p class="error" aria-live="polite">
				{$_('create_container_dialog.template_load_error')}
			</p>
		{/if}
	</aside>
{/if}

<style>
	aside {
		align-items: flex-start;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow-y: auto;
		width: 18.75rem;
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
