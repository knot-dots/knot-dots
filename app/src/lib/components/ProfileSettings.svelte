<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import saveUser from '$lib/client/saveUser';
	import { user as userSchema } from '$lib/models';
	import { user } from '$lib/stores';

	async function save(event: { currentTarget: HTMLFormElement }) {
		const data = new FormData(event.currentTarget);

		const parseResult = userSchema.safeParse({
			family_name: data.get('familyName'),
			given_name: data.get('givenName'),
			guid: $user.guid,
			realm: env.PUBLIC_KC_REALM
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
</script>

<form class="details" on:submit|preventDefault={save}>
	<label>
		{$_('given_name')}
		<input name="givenName" type="text" value={$user.givenName} maxlength="32" required />
	</label>

	<label>
		{$_('family_name')}
		<input name="familyName" type="text" value={$user.familyName} maxlength="32" required />
	</label>

	<footer>
		<button class="primary" type="submit">{$_('save')}</button>
		<a class="button" href={changePasswordURL($page.url.href)}>
			{$_('profile_settings.change_password')}
		</a>
	</footer>
</form>
