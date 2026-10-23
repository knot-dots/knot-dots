<script lang="ts">
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import type { PayloadType } from '$lib/models';
	import { moduleByType } from '$lib/modules';
	import { payloadTypeIcons } from '$lib/theme/models';

	interface Props {
		value: PayloadType;
	}

	let { value }: Props = $props();
</script>

{const Icon = payloadTypeIcons.get(value)}
<span
	{@attach tooltip($_('payload_type'))}
	class={['badge', 'badge--large', `module-${moduleByType.get(value)}`]}
>
	<Icon />
	{$_(value)}
</span>
