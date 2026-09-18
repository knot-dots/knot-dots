<script lang="ts">
	import { _ } from 'svelte-i18n';
	import StarSolid from '~icons/flowbite/star-solid';
	import StarOutline from '~icons/flowbite/star-outline';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import tooltip from '$lib/attachments/tooltip';
	import saveUser from '$lib/client/saveUser';
	import { getFavoriteListContext } from '$lib/contexts/favoriteList';
	import { user as userSchema } from '$lib/models';
	import { user } from '$lib/stores';

	let href = $derived(
		page.url.searchParams.size
			? `${page.url.pathname}?${page.url.searchParams.toString()}`
			: page.url.pathname
	);

	const favoriteList = getFavoriteListContext();

	let isFavorite = $derived(favoriteList.user.findIndex((f) => f.href === href) > -1);

	async function toggleFavorite() {
		const index = favoriteList.user.findIndex((f) => f.href === href);

		favoriteList.user =
			index > -1
				? favoriteList.user.filter((_, i) => i !== index)
				: [...favoriteList.user, { href, title: page.data.title ?? $_('new_favorite') }];

		const parseResult = userSchema.safeParse({
			family_name: $user.familyName,
			given_name: $user.givenName,
			guid: $user.guid,
			realm: env.PUBLIC_KC_REALM,
			settings: { ...$user.settings, favorite: favoriteList.user }
		});

		if (parseResult.success) {
			const response = await saveUser(parseResult.data);

			if (!response.ok) {
				const error = await response.json();
				alert(error.message);
			}
		}
	}
</script>

<button class="action-button" onclick={toggleFavorite} type="button">
	{#if isFavorite}
		<StarSolid {@attach tooltip($_('remove_from_sidebar'))} />
	{:else}
		<StarOutline {@attach tooltip($_('add_to_sidebar'))} />
	{/if}
</button>
