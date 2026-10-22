<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import type {
		AnyPayload,
		Container,
		Grant,
		InheritedMatrixSection,
		TeamWithMembers,
		User
	} from '$lib/models';

	interface Props {
		admins?: User[];
		adminTeams?: TeamWithMembers[];
		container: Container<AnyPayload>;
		grants: Grant[];
		inheritedSections?: InheritedMatrixSection[];
		mayManageOrganizationUsers?: boolean;
		teams: TeamWithMembers[];
		users: User[];
	}

	let {
		admins,
		adminTeams,
		container,
		grants,
		inheritedSections,
		mayManageOrganizationUsers,
		teams,
		users
	}: Props = $props();
</script>

<Header workspaceOptions={[]} />

<div class="content">
	<div class="details details-scroll-wrapper">
		<div class="details-section">
			<Members
				{admins}
				{adminTeams}
				{container}
				{grants}
				{inheritedSections}
				{mayManageOrganizationUsers}
				{teams}
				{users}
			/>
		</div>
	</div>

	<ContextTabs slug="members" />
</div>
