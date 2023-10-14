<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type { AnyContainer, EmptyTextContainer, TextContainer } from '$lib/models';

	export let container: TextContainer | EmptyTextContainer;
	export let isPartOfOptions: AnyContainer[];
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		{#key container}
			<Editor label={$_('body')} bind:value={container.payload.body} />
		{/key}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<RelationSelector {container} {isPartOfOptions} />
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
