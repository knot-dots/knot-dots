<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { AnyPayload, Container, Grant, InheritedMatrixSection, User } from '$lib/models';

	interface Props {
		admins?: User[];
		container: Container<AnyPayload>;
		grants: Grant[];
		inheritedSections?: InheritedMatrixSection[];
		mayManageOrganizationUsers?: boolean;
		users: User[];
	}

	let { admins, container, grants, inheritedSections, mayManageOrganizationUsers, users }: Props =
		$props();
</script>

<Header workspaceOptions={[]} />

<div class="content">
	<div class="details details-scroll-wrapper">
		<div class="details-section">
			<Members
				{admins}
				{container}
				{grants}
				{inheritedSections}
				{mayManageOrganizationUsers}
				{users}
			/>
		</div>
	</div>

	<ContextTabs slug="members" />
</div>
