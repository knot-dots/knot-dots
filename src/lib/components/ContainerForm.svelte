<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import { modifiedContainer, newContainer, payloadTypes } from '$lib/models';
	import type {
		Container,
		CustomEventMap,
		EmptyContainer,
		ModifiedContainer,
		NewContainer
	} from '$lib/models';
	import { page } from '$app/stores';

	export let container: Container | EmptyContainer;

	let isPage =
		'guid' in container
			? $page.url.pathname == `/${container.payload.type}/${container.guid}/edit`
			: $page.url.pathname == `/${container.payload.type}/new`;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	const dispatch =
		createEventDispatcher<Pick<CustomEventMap, 'submitSuccessful' | 'deleteSuccessful'>>();

	async function handleSubmit(event: SubmitEvent) {
		let url = '/container';
		let data: ModifiedContainer | NewContainer;

		const formData = new FormData(event.target as HTMLFormElement);

		const parseResult = z.union([modifiedContainer, newContainer]).safeParse({
			...container,
			realm: env.PUBLIC_KC_REALM,
			relation: container.relation
				.filter((r) => ('guid' in container ? r.subject == container.revision : true))
				.map(({ object, position, predicate }) => ({
					predicate,
					object,
					position
				})),
			user: []
		});

		if (parseResult.success) {
			data = parseResult.data;
		} else {
			alert(parseResult.error);
			return;
		}

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch(() => null);

		const upload = formData.get('upload');

		if (
			upload instanceof File &&
			upload.size > 0 &&
			data.payload.type == payloadTypes.enum.strategy
		) {
			const uploadResponse = await fetch('/upload', {
				method: 'POST',
				body: formData,
				headers: {
					...(sessionStorage.getItem('token')
						? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
						: undefined)
				}
			});

			if (uploadResponse.ok) {
				data.payload.image = uploadResponse.headers.get('Location') as string;
			} else {
				return;
			}
		}

		if ('guid' in container) {
			url = `/container/${container.guid}/revision`;
		}

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

	async function handleDelete(event: Event) {
		if ('guid' in container) {
			// Ensure a fresh token will be included in the Authorization header.
			await getKeycloak()
				.updateToken(-1)
				.catch(() => null);

			const response = await fetch(`/container/${container.guid}`, {
				method: 'DELETE',
				headers: {
					...(sessionStorage.getItem('token')
						? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
						: undefined),
					'Content-Type': 'application/json'
				}
			});
			if (response.ok) {
				dispatch('deleteSuccessful', { event });
			}
		}
	}
</script>

<form class="details" class:details--page={isPage} on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_(`${container.payload.type}`)}
			<input name="title" type="text" bind:value={container.payload.title} required />
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<slot name="data" />
		</div>

		<div class="details-content-column">
			<slot name="meta" />
		</div>
	</div>

	<footer>
		<button class="primary" type="submit">{$_('save')}</button>
		<slot name="extra-buttons" />
		<button class="delete quiet" title={$_('delete')} type="button" on:click={handleDelete}>
			<Icon src={Trash} size="20" />
		</button>
	</footer>
</form>

<style>
	footer {
		display: flex;
		gap: 0.5rem;
	}

	.delete {
		color: var(--color-red-500);
		margin-left: auto;
	}
</style>
