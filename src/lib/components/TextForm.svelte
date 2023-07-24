<script lang="ts">
	import { Editor } from 'bytemd';
	import 'bytemd/dist/index.css';
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type { Container, EmptyTextContainer, TextContainer } from '$lib/models';

	export let container: TextContainer | EmptyTextContainer;
	export let isPartOfOptions: Container[];
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			{$_('Body')}
			<Editor
				value={container.payload.body ?? ''}
				on:change={(e) => (container.payload.body = e.detail.value)}
			/>
		</label>
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<RelationSelector {container} {isPartOfOptions} />
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
