<script lang="ts">
	import { _ as _t } from 'svelte-i18n';
	import ParentDropdown from '$lib/components/ParentDropdown.svelte';
	import { type Container, type EmptyContainer } from '$lib/models';

	interface Props {
		container: Container | EmptyContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

<div class="label">{$_t('superordinate_element')}</div>
<ParentDropdown {editable} {container} />
