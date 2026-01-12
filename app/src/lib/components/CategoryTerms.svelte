<script lang="ts">
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import fetchContainers from '$lib/client/fetchContainers';
	import saveContainer from '$lib/client/saveContainer';
	import {
		ability,
		applicationState
	} from '$lib/stores';
	import {
		container as containerSchema,
		containerOfType,
		isTermContainer,
		type AnyContainer,
		type CategoryContainer,
		type NewContainer,
		type TermContainer,
		payloadTypes,
		predicates
	} from '$lib/models';

	interface Props {
		container: CategoryContainer;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers = $bindable() }: Props = $props();

	const predicate = predicates.enum['is-part-of-category'];

	let terms = $state([] as TermContainer[]);
	let creating = $state(false);
	let linkingGuid = $state<string | null>(null);
	let removingGuid = $state<string | null>(null);
	let formError = $state('');

	let newTitle = $state('');
	let newValue = $state('');
	let newDescription = $state('');
	let valueTouched = $state(false);

	let searchQuery = $state('');
	let searchResults = $state([] as TermContainer[]);
	let searchLoading = $state(false);
	let searchToken = 0;

	$effect(() => {
		terms = relatedContainers
			.filter(isTermContainer)
			.filter(({ relation }) =>
				relation.some(
					({ object, predicate: p }) => object === container.guid && p === predicate
				)
			)
			.toSorted((a, b) =>
				a.payload.title.localeCompare(b.payload.title, undefined, { sensitivity: 'base' })
			);
	});

	function slugify(source: string) {
		return source
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	$effect(() => {
		if (!valueTouched) {
			newValue = slugify(newTitle);
		}
	});

	$effect(() => {
		const query = searchQuery.trim();
		const token = ++searchToken;
		if (!query) {
			searchResults = [];
			searchLoading = false;
			return;
		}

		searchLoading = true;
		(async () => {
			try {
				const containers = await fetchContainers(
					{ payloadType: [payloadTypes.enum.term], terms: query },
					'alpha'
				);
				if (token !== searchToken) {
					return;
				}
				searchResults = containers
					.filter(isTermContainer)
					.filter(({ guid }) => !terms.some((term) => term.guid === guid));
			} catch (error) {
				if (token !== searchToken) {
					return;
				}
				searchResults = [];
			} finally {
				if (token === searchToken) {
					searchLoading = false;
				}
			}
		})();
	});

	function resetForm() {
		newTitle = '';
		newValue = '';
		newDescription = '';
		valueTouched = false;
		formError = '';
	}

	async function syncParentRelations(nextTerms: TermContainer[]) {
		const currentRelations = container.relation ?? [];
		container.relation = [
			...nextTerms.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate,
				subject: guid
			})),
			...currentRelations.filter(({ predicate: p }) => p !== predicate)
		];

		const response = await fetch(`/container/${container.guid}/relation`, {
			method: 'POST',
			body: JSON.stringify(container.relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.message ?? 'Failed to update category');
		}
	}

	async function handleCreateTerm(event: SubmitEvent) {
		event.preventDefault();
		if (creating) {
			return;
		}

		const title = newTitle.trim();
		const value = newValue.trim();

		if (!title || !value) {
			formError = get(_)('category.terms.required');
			return;
		}

		creating = true;
		formError = '';
		try {
			const newTerm = containerOfType(
				payloadTypes.enum.term,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;
			newTerm.payload.title = title;
			newTerm.payload.value = value;
			if (newDescription.trim()) {
				newTerm.payload.description = newDescription.trim();
			}
			newTerm.relation = [
				{
					object: container.guid,
					position: terms.length,
					predicate
				}
			];

			const response = await saveContainer(newTerm);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to create term');
			}
			const parsed = containerSchema.safeParse(payload);
			if (!parsed.success || !isTermContainer(parsed.data)) {
				throw new Error('Unexpected response while creating term');
			}

			const created = parsed.data;
			const nextTerms = [...terms, created].toSorted((a, b) =>
				a.payload.title.localeCompare(b.payload.title, undefined, { sensitivity: 'base' })
			);
			relatedContainers = [
				...relatedContainers.filter(({ guid }) => guid !== created.guid),
				created
			];
			await syncParentRelations(nextTerms);
			resetForm();
		} catch (error) {
			formError = error instanceof Error ? error.message : String(error);
		} finally {
			creating = false;
		}
	}

	async function attachTerm(term: TermContainer) {
		if (linkingGuid) {
			return;
		}

		linkingGuid = term.guid;
		try {
			const updatedTerm = {
				...term,
				relation: [
					...(term.relation ?? []).filter(
						({ object, predicate: p }) => !(object === container.guid && p === predicate)
					),
					{
						object: container.guid,
						position: terms.length,
						predicate
					}
				]
			};

			const response = await saveContainer(updatedTerm);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to link term');
			}
			const parsed = containerSchema.safeParse(payload);
			if (!parsed.success || !isTermContainer(parsed.data)) {
				throw new Error('Unexpected response while linking term');
			}

			const saved = parsed.data;
			const nextTerms = [...terms, saved].toSorted((a, b) =>
				a.payload.title.localeCompare(b.payload.title, undefined, { sensitivity: 'base' })
			);
			relatedContainers = [
				...relatedContainers.filter(({ guid }) => guid !== saved.guid),
				saved
			];
			await syncParentRelations(nextTerms);
			searchQuery = '';
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			linkingGuid = null;
		}
	}

	async function detachTerm(term: TermContainer) {
		if (removingGuid) {
			return;
		}

		removingGuid = term.guid;
		try {
			const updatedTerm = {
				...term,
				relation: (term.relation ?? []).filter(
					({ object, predicate: p }) => !(object === container.guid && p === predicate)
				)
			};

			const response = await saveContainer(updatedTerm);
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message ?? 'Failed to remove term');
			}

			const nextTerms = terms.filter(({ guid }) => guid !== term.guid);
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== term.guid);
			await syncParentRelations(nextTerms);
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			removingGuid = null;
		}
	}

	const canEdit = $derived(
		$applicationState.containerDetailView.editable && $ability.can('update', container)
	);
</script>

<div class="category-terms details-section">
	<div class="category-terms__header">
		<h2>{$_('category.terms.heading')}</h2>
	</div>

	{#if terms.length === 0}
		<p class="category-terms__empty">{$_('category.terms.empty')}</p>
	{:else}
		<ul class="category-terms__list">
			{#each terms as term}
				<li class="category-terms__item">
					<div>
						<p class="category-terms__title">{term.payload.title}</p>
						<p class="category-terms__value">{$_('category.terms.value_label')}: {term.payload.value}</p>
						{#if term.payload.description}
							<p class="category-terms__description">{term.payload.description}</p>
						{/if}
					</div>

					{#if canEdit}
						<button
							type="button"
							class="button button-xs button-alternative"
							onclick={() => detachTerm(term)}
							disabled={removingGuid === term.guid}
						>
							{$_('category.terms.remove_button')}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if canEdit}
		<form class="category-terms__form" onsubmit={handleCreateTerm}>
			<h3>{$_('category.terms.create_title')}</h3>

			<label>
				<span>{$_('title')}</span>
				<input
					type="text"
					placeholder={$_('title')}
					required
					bind:value={newTitle}
				/>
			</label>

			<label>
				<span>{$_('category.terms.value_label')}</span>
				<input
					type="text"
					placeholder={$_('category.terms.value_label')}
					required
					bind:value={newValue}
					oninput={() => (valueTouched = true)}
				/>
			</label>

			<label>
				<span>{$_('description')}</span>
				<textarea
					rows="2"
					placeholder={$_('category.terms.description_placeholder')}
					bind:value={newDescription}
				></textarea>
			</label>

			{#if formError}
				<p class="category-terms__error">{formError}</p>
			{/if}

			<button class="button button-primary" type="submit" disabled={creating}>
				{$_('category.terms.create_button')}
			</button>
		</form>

		<div class="category-terms__existing">
			<h3>{$_('category.terms.link_existing')}</h3>
			<input
				type="search"
				placeholder={$_('category.terms.search_placeholder')}
				bind:value={searchQuery}
			/>

			{#if searchLoading}
				<p class="category-terms__hint">{$_('loading')}…</p>
			{:else if searchResults.length > 0}
				<ul class="category-terms__results">
					{#each searchResults.slice(0, 10) as term}
						<li>
							<div>
								<p class="category-terms__title">{term.payload.title}</p>
								<p class="category-terms__value">{term.payload.value}</p>
							</div>
							<button
								type="button"
								class="button button-xs"
								onclick={() => attachTerm(term)}
								disabled={linkingGuid === term.guid}
							>
								{$_('category.terms.link_button')}
							</button>
						</li>
					{/each}
				</ul>
			{:else if searchQuery.trim()}
				<p class="category-terms__hint">{$_('category.terms.no_results')}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.category-terms {
		gap: 1rem;
		display: flex;
		flex-direction: column;
	}

	.category-terms__list,
	.category-terms__results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category-terms__item,
	.category-terms__results li {
		align-items: center;
		background: var(--color-gray-050);
		border-radius: 8px;
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		gap: 1rem;
	}

	.category-terms__title {
		font-weight: 600;
		margin: 0;
	}

	.category-terms__value,
	.category-terms__description {
		margin: 0.125rem 0 0;
		color: var(--color-gray-600);
		font-size: 0.875rem;
	}

	.category-terms__form,
	.category-terms__existing {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.category-terms__form h3,
	.category-terms__existing h3,
	.category-terms__header h2 {
		margin: 0;
	}

	.category-terms__form label,
	.category-terms__existing label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.category-terms__form input,
	.category-terms__form textarea,
	.category-terms__existing input {
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		padding: 0.5rem;
	}

	.category-terms__empty,
	.category-terms__hint,
	.category-terms__error {
		margin: 0;
		color: var(--color-gray-600);
	}

	.category-terms__error {
		color: var(--color-red-600);
	}
</style>
