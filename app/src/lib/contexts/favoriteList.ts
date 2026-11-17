import { createContext } from 'svelte';
import type { Favorite } from '$lib/models';

export type { Favorite };

export const [getFavoriteListContext, setFavoriteListContext] = createContext<{
	organization: Favorite[];
	organizationalUnit: Favorite[];
	platform: Favorite[];
	user: Favorite[];
}>();
