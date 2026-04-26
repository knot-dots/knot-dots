<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ImageReplacesText from '~icons/knotdots/text-slash';

	interface Props {
		value: boolean;
	}

	let { value = $bindable() }: Props = $props();
</script>

<label class="action-button action-button--size-l" for="imageReplacesName">
	<input
		bind:checked={() => !value, (v) => (value = !v)}
		class="is-visually-hidden"
		id="imageReplacesName"
		type="checkbox"
	/>
	<ImageReplacesText />
	{value ? $_('show_title') : $_('hide_title')}
</label>
