<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Label from '~icons/flowbite/label-outline';
	import { getDetailViewContext } from '$lib/contexts/detailView';
	import { getPropertiesRelocationContext } from '$lib/contexts/propertiesRelocationNotice';

	const detailView = getDetailViewContext();

	const propertiesRelocationNotice = getPropertiesRelocationContext();
</script>

{#if detailView && propertiesRelocationNotice && !propertiesRelocationNotice.seen}
	<div class="details-section">
		<div class="box system-info">
			<div class="box-icon">
				<Label />
			</div>
			<div class="box-content">
				<h4>{$_('properties_relocation_notice_heading')}</h4>
				<p>{$_('properties_relocation_notice_text')}</p>
				<button class="button-xs" onclick={detailView.properties.trigger.onclick} type="button">
					{$_('properties_relocation_notice_button')}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.box {
		align-items: flex-start;
		background: var(--color-surface-accent-container);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 24px;
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
	}

	.box-icon {
		background: var(--color-background-accent-subtle);
		border-radius: 8px;
		color: var(--color-accent-on-default);
		padding: 0.375rem;
	}

	.box-content {
		flex: 1;
	}

	h4 {
		color: var(--color-text-strong);
		font-weight: 500;
	}

	p {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
	}

	button {
		background-color: var(--color-white);
		border-radius: 8px;
		border: 1px solid var(--color-border-subtle);
		color: var(--color-text-accent-strong);
		font-size: 14px;
		font-weight: 500;
		justify-content: center;
		margin-top: 0.75rem;
		width: 100%;
	}
</style>
