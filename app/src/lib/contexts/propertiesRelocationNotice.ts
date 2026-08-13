import { getContext, setContext } from 'svelte';

const key = {};

interface PropertiesRelocationNotice {
	seen: boolean;
}

export function setPropertiesRelocationContext(context: PropertiesRelocationNotice) {
	return setContext(key, context);
}

export function getPropertiesRelocationContext(): PropertiesRelocationNotice {
	return getContext(key);
}
