<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
    import PlaceholderImage from '~icons/knotdots/placeholder-image';
	import requestSubmit from '$lib/client/requestSubmit';
	import { uploadAsFormData } from '$lib/client/upload';
	import transformFileURL from '$lib/transformFileURL.js';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	let uploadInProgress = $state(false);

	const id = crypto.randomUUID();

	function remove(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		value = undefined;
		requestSubmit(event);
	}

	async function upload(event: Event) {
    console.log("LOAD ME UP");
		event.stopPropagation();
		const input = event.currentTarget as HTMLInputElement;
		if (input.files instanceof FileList && input.files.length > 0) {
			try {
				uploadInProgress = true;
				value = await uploadAsFormData(input.files[0]);
				input.form?.requestSubmit();
			} catch (e) {
				console.log(e);
			} finally {
				uploadInProgress = false;
			}
		}
	}
</script>

{#if editable}
	<label class="button action-button" for={id}>
		<PlaceholderImage />
		{label}
	</label>
	<input
			name="cover"
			accept="image/png,image/jpeg,image/svg+xml"
			class="is-visually-hidden"
			{id}
			oninput={upload}
			type="file"
	/>
{/if}
