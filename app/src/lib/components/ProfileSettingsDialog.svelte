<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { featureFlags } from '$lib/features';
	import saveUser from '$lib/client/saveUser';
	import { user as userSchema } from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	let features = $derived('features' in $user.settings ? $user.settings.features : []);

	async function save(event: { currentTarget: HTMLFormElement }) {
		const data = new FormData(event.currentTarget);

		const parseResult = userSchema.safeParse({
			family_name: data.get('familyName'),
			given_name: data.get('givenName'),
			guid: $user.guid,
			realm: env.PUBLIC_KC_REALM,
			settings: { features: data.getAll('feature') }
		});

		if (parseResult.success) {
			try {
				await saveUser(parseResult.data);
				await invalidateAll();
			} catch (error) {
				alert(error);
			}
		} else {
			console.log(parseResult.error);
		}
	}

	function changePasswordURL(referrer_uri: string) {
		const url = new URL(
			`${env.PUBLIC_KC_URL}/realms/${env.PUBLIC_KC_REALM}/account/account-security/signing-in`
		);
		url.searchParams.set('referrer', env.PUBLIC_KC_CLIENT_ID ?? '');
		url.searchParams.set('referrer_uri', referrer_uri);
		return url.toString();
	}

	function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
		if (event.submitter?.classList.contains('button-primary')) {
			save(event);
		}

		dialog.close();
	}
</script>

<dialog bind:this={dialog}>
	<form method="dialog" onsubmit={handleSubmit}>
		<p class="dialog-actions">
			<span>{$_('profile_settings.title')}</span>
			<button class="button-xs button-primary" type="submit">
				{$_('save')}
			</button>
			<button class="button-xs button-alternative" formnovalidate type="submit">
				{$_('cancel')}
			</button>
		</p>

		<div>
			<fieldset class="data-grid">
				<label for="givenName">
					{$_('given_name')}
				</label>
				<input
					id="givenName"
					maxlength="32"
					name="givenName"
					required
					type="text"
					value={$user.givenName}
				/>

				<label for="familyName">
					{$_('family_name')}
				</label>
				<input
					id="familyName"
					maxlength="32"
					name="familyName"
					required
					type="text"
					value={$user.familyName}
				/>
			</fieldset>

			<fieldset>
				<legend>{$_('feature_flags')}</legend>
				<ul>
					{#each featureFlags.entries() as [key, value] (key)}
						{#if (key == 'alpha' && $user.roles.includes('alpha-testing')) || key == 'beta'}
							<li>
								<p><strong>{key}</strong></p>
								<ul>
									{#each value as flag (flag)}
										<li>
											<label>
												<input type="checkbox" name="feature" value={flag} bind:group={features} />
												{flag}
											</label>
										</li>
									{/each}
								</ul>
							</li>
						{/if}
					{/each}
				</ul>
			</fieldset>

			<footer>
				<a class="button button-xs button-alternative" href={changePasswordURL(page.url.href)}>
					{$_('profile_settings.change_password')}
				</a>
			</footer>
		</div>
	</form>
</dialog>

<style>
	dialog {
		color: var(--color-gray-500);
		width: calc(min(54rem, 100vw));
	}

	div {
		container-type: inline-size;
		overflow: auto;
		padding: 1.5rem;
	}

	@media (min-width: 768px) {
		div {
			padding: 1.5rem 5rem 5rem;
		}
	}

	fieldset {
		align-items: center;
		margin-bottom: 1rem;
	}

	input {
		border: none;
		border-radius: 4px;
		color: var(--color-gray-700);
		padding: 0.375rem;
	}

	.button-primary {
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		margin-left: auto;
	}

	.dialog-actions {
		align-items: center;
		background-color: white;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.data-grid {
		border: none;
		border-radius: 0;
		border-left: 2px solid var(--gray-200, #e5e7eb);
		padding: 0.5rem 0 0.5rem 1.5rem;
	}

	@container (min-inline-size: 20rem) {
		.data-grid {
			grid-template-columns: 1fr minmax(0, 3fr);
		}

		.data-grid > label {
			grid-column: 1 / 2;
		}

		.data-grid > input {
			grid-column: 2 / 3;
		}
	}
</style>
