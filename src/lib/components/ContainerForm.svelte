<script lang="ts">
	import { Editor } from 'bytemd';
	import 'bytemd/dist/index.css';
	import { createEventDispatcher, getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import { modifiedContainer, newContainer } from '$lib/models';
	import type {
		Container,
		CustomEventMap,
		EmptyContainer,
		ModifiedContainer,
		NewContainer
	} from '$lib/models';
	export let container: Container | EmptyContainer;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	const dispatch = createEventDispatcher<Pick<CustomEventMap, 'submitSuccessful'>>();

	async function handleSubmit(event: SubmitEvent) {
		let url = '/container';
		let data: ModifiedContainer | NewContainer;

		const formData = new FormData(event.target as HTMLFormElement);
		const parseResult = z.union([modifiedContainer, newContainer]).safeParse({
			...container,
			realm: env.PUBLIC_KC_REALM,
			relation: formData
				.getAll('is-part-of')
				.map((v) => ({ predicate: 'is-part-of', object: Number(v) })),
			user: []
		});

		if (parseResult.success) {
			data = parseResult.data;
		} else {
			return;
		}

		if ('guid' in container) {
			url = `/container/${container.guid}/revision`;
		}

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch(() => null);

		const response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(data),
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined),
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			dispatch('submitSuccessful', { event, result: (await response.json()) as Container });
		}
	}
</script>

<form class="details" on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_(`${container.payload.type}`)}
			<input name="title" type="text" bind:value={container.payload.title} required />
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
			</label>
			<label>
				{$_('description')}
				<Editor value={container.payload.description ?? ""} on:change={(e) => container.payload.description = e.detail.value } />
			</label>
			<slot name="extra-data" />
		</div>

		<div class="details-content-column">
			<slot name="meta" />
		</div>
	</div>

	<footer>
		<button class="primary" type="submit">{$_('save')}</button>
		<slot name="extra-buttons" />
	</footer>
</form>
