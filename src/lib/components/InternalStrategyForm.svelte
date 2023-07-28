<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import type { EmptyInternalStrategyContainer, InternalStrategyContainer } from '$lib/models';
	import { Editor } from 'bytemd';

	export let container: InternalStrategyContainer | EmptyInternalStrategyContainer;
</script>

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			{$_('summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
		</label>
		<label>
			{$_('description')}
			<Editor
				value={container.payload.description ?? ''}
				on:change={(e) => (container.payload.description = e.detail.value)}
			/>
		</label>
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
