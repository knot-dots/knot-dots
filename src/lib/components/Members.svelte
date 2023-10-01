<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { ChevronLeft, Icon, Trash, UserPlus } from 'svelte-hero-icons';
	import { invalidateAll } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import Dialog from '$lib/components/Dialog.svelte';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import saveContainerUser from '$lib/client/saveContainerUser';
	import saveUser from '$lib/client/saveUser';
	import { predicates } from '$lib/models';
	import type { AnyContainer, User } from '$lib/models';
	import { user } from '$lib/stores';

	export let container: AnyContainer;
	export let users: Readonly<Array<User>>;

	let dialog: HTMLDialogElement;
	let email: string;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	function isAdminOf(user: User, container: AnyContainer) {
		return (
			container.user.findIndex(
				({ predicate, subject }) =>
					user.subject == subject && predicate == predicates.enum['is-admin-of']
			) > -1
		);
	}

	async function handleToggleAdmin(user: User, container: AnyContainer) {
		const response = await saveContainerUser(getKeycloak(), {
			...container,
			user: [
				...container.user.filter(({ predicate }) => predicate != predicates.enum['is-admin-of']),
				...(isAdminOf(user, container)
					? []
					: [{ subject: user.subject, predicate: predicates.enum['is-admin-of'] }])
			]
		});
		if (!response.ok) {
			console.log(await response.json());
		}
		await invalidateAll();
	}

	async function handleRemoveRelations(user: User, container: AnyContainer) {
		const response = await saveContainerUser(getKeycloak(), {
			...container,
			user: [
				...container.user.filter(
					({ predicate, subject }) =>
						subject != user.subject ||
						(predicate != predicates.enum['is-admin-of'] &&
							predicate != predicates.enum['is-member-of'])
				)
			]
		});
		if (!response.ok) {
			console.log(await response.json());
		}
		await invalidateAll();
	}

	async function handleInvite() {
		try {
			const userResponse = await saveUser(getKeycloak(), {
				email,
				organization: container.organization,
				realm: env.PUBLIC_KC_REALM as string
			});
			const userResponseData = await userResponse.json();
			await saveContainerUser(getKeycloak(), {
				...container,
				user: [
					...container.user,
					{ subject: userResponseData.subject, predicate: predicates.enum['is-member-of'] }
				]
			});
			await invalidateAll();
		} catch (error) {
			console.log(error);
			alert($_('invite.failure'));
		}
		dialog.close();
	}
</script>

<div class="details details--page">
	<header>
		<h2>
			{'title' in container.payload ? container.payload.title : container.payload.name}
			<span class="icons">
				{#if $user.isAuthenticated}
					<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
						<button class="icons-element" type="button" on:click={() => window.history.back()}>
							<Icon solid src={ChevronLeft} size="20" />
						</button>
					</a>
				{/if}
			</span>
		</h2>
	</header>
	<div class="table">
		<table>
			<thead>
				<tr>
					<th scope="col">{$_('user.email')}</th>
					<th scope="col">{$_('role.administrator')}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each users as u (u.subject)}
					<tr>
						<td>{u.display_name}</td>
						<td>
							{#key container.user}
								<input
									type="checkbox"
									checked={isAdminOf(u, container)}
									on:click={() => handleToggleAdmin(u, container)}
								/>
							{/key}
						</td>
						<td>
							<button
								class="quiet"
								type="button"
								title={$_('user.remove_relations')}
								on:click={() => handleRemoveRelations(u, container)}
							>
								<Icon src={Trash} size="20" />
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<footer>
		<button class="primary" type="button" on:click={() => dialog.showModal()}>
			<Icon src={UserPlus} size="24" />
		</button>
	</footer>
</div>

<Dialog bind:dialog>
	<form on:submit|preventDefault={handleInvite}>
		<h3>{$_('invite.heading')}</h3>
		<label>
			{$_('invite.email')}
			<!-- svelte-ignore a11y-autofocus -->
			<input type="email" bind:value={email} autofocus required />
		</label>
		<button class="primary" type="submit">{$_('invite.submit')}</button>
	</form>
</Dialog>

<style>
	td:last-child {
		text-align: right;
	}

	form h3 {
		margin-bottom: 1rem;
	}

	form button {
		display: block;
		margin-top: 1.5rem;
		width: 100%;
	}

	form label {
		display: block;
		margin-top: 1rem;
	}

	form input {
		display: block;
		width: 100%;
	}

	.table {
		overflow-x: auto;
		padding: 1.5rem;
	}
</style>
