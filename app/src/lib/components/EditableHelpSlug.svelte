<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import { helpSlug, type HelpSlug } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();

	function helpSlugLabel(slug: HelpSlug) {
		return $_(`help_slug.option.${slug}`);
	}

	const options = [...helpSlug.options]
		.map((slug) => ({
			label: helpSlugLabel(slug),
			value: slug
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
</script>

<EditableMultipleChoice {editable} label={$_('help_slug.label')} {options} bind:value />
