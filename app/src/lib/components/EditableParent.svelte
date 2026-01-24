<script lang="ts">
	import { _ as _t } from 'svelte-i18n';
	import ParentDropdown from '$lib/components/ParentDropdown.svelte';
	import { type Container, type NewContainer } from '$lib/models';

	interface Props {
		container: Container | NewContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_t('superordinate_element')}</div>
<ParentDropdown bind:container {editable} labelledBy={id} />
