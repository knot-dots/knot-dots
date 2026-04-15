import { createContext } from 'svelte';

export interface Favorite {
	href: string;
	icon?: string;
	title: string;
}

export const [getFavoriteListContext, setFavoriteListContext] = createContext<{
	organization: Favorite[];
	organizationalUnit: Favorite[];
}>();
