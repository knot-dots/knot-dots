import { createContext } from 'svelte';

export const [getFavoriteListContext, setFavoriteListContext] = createContext<{
	item: Array<{ href: string; icon?: string; title: string }>;
}>();
