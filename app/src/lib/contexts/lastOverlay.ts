import { createContext } from 'svelte';

export const [getLastOverlayContext, setLastOverlayContext] = createContext<{
	url?: URL;
}>();
