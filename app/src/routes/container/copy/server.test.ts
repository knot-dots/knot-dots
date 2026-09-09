import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const { executeContainerCopy, loadContainerCopyPreview } = vi.hoisted(() => ({
	executeContainerCopy: vi.fn(),
	loadContainerCopyPreview: vi.fn()
}));

locale.set('en');

vi.mock('$lib/server/containerCopyService', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCopyService')>()),
	executeContainerCopy,
	loadContainerCopyPreview
}));

import { payloadTypes } from '$lib/models';
import { CopyPlanError } from '$lib/server/containerCopyPlan';
import { ContainerCopyServiceError } from '$lib/server/containerCopyService';
import { GET, POST } from './+server';

const sourceGuid = '00000000-0000-4000-8000-000000000001';
const organizationGuid = '00000000-0000-4000-8000-000000000002';
const user = {
	adminOf: [],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: '00000000-0000-4000-8000-000000000003',
	headOf: [],
	isAuthenticated: true,
	memberOf: [],
	roles: ['sysadmin'],
	settings: {}
};

function request(body: unknown, contentType = 'application/json; charset=utf-8') {
	return new Request('http://localhost/container/copy', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': contentType }
	});
}

function event(body: unknown, contentType?: string) {
	return {
		locals: { pool: {}, user },
		request: request(body, contentType)
	} as never;
}

const validRequest = {
	operation: 'copy',
	sourceGuid,
	targetOrganizationGuid: organizationGuid,
	targetOrganizationalUnitGuid: null,
	rootPayload: { title: 'Edited root', type: payloadTypes.enum.text }
};

beforeEach(() => {
	executeContainerCopy.mockReset();
	loadContainerCopyPreview.mockReset();
});

test('loads a program-scoped copy preview from strict query parameters', async () => {
	const availableIn = '00000000-0000-4000-8000-000000000005';
	const preview = { containers: [], rows: [], rootGuid: sourceGuid };
	loadContainerCopyPreview.mockResolvedValue(preview);

	const response = await GET({
		locals: { pool: {}, user },
		url: new URL(
			`http://localhost/container/copy?sourceGuid=${sourceGuid}&availableIn=${availableIn}`
		)
	} as never);

	expect(response.status).toBe(200);
	expect(await response.json()).toEqual(preview);
	expect(loadContainerCopyPreview).toHaveBeenCalledWith(
		expect.objectContaining({ request: { availableIn, sourceGuid }, user })
	);
});

test('rejects malformed, repeated, and unexpected preview parameters', async () => {
	for (const query of [
		'',
		`?sourceGuid=${sourceGuid}&sourceGuid=${sourceGuid}`,
		`?sourceGuid=${sourceGuid}&extra=true`,
		'?sourceGuid=not-a-guid'
	]) {
		await expect(
			GET({
				locals: { pool: {}, user },
				url: new URL(`http://localhost/container/copy${query}`)
			} as never)
		).rejects.toMatchObject({ status: 400 });
	}
	expect(loadContainerCopyPreview).not.toHaveBeenCalled();
});

test('returns the persisted root with the established creation contract', async () => {
	const root = { guid: '00000000-0000-4000-8000-000000000004', payload: validRequest.rootPayload };
	executeContainerCopy.mockResolvedValue(root);

	const response = await POST(event(validRequest));

	expect(response.status).toBe(201);
	expect(response.headers.get('location')).toBe(`/container/${root.guid}`);
	expect(await response.json()).toEqual(root);
	expect(executeContainerCopy).toHaveBeenCalledWith(
		expect.objectContaining({
			request: expect.objectContaining({
				...validRequest,
				rootPayload: expect.objectContaining(validRequest.rootPayload)
			}),
			user
		})
	);
});

test('rejects client-owned envelope and relation fields', async () => {
	await expect(
		POST(
			event({
				...validRequest,
				creatorGuid: user.guid,
				relation: [{ object: sourceGuid, predicate: 'is-copy-of' }]
			})
		)
	).rejects.toMatchObject({ status: 422 });
	expect(executeContainerCopy).not.toHaveBeenCalled();
});

test('rejects unauthenticated and unsupported-content requests before parsing', async () => {
	await expect(
		POST({
			locals: { pool: {}, user: { ...user, isAuthenticated: false } },
			request: request(validRequest)
		} as never)
	).rejects.toMatchObject({ status: 401 });
	await expect(POST(event(validRequest, 'text/plain'))).rejects.toMatchObject({ status: 415 });
});

test('returns a stable bad-request response for malformed JSON', async () => {
	const malformed = new Request('http://localhost/container/copy', {
		method: 'POST',
		body: '{',
		headers: { 'Content-Type': 'application/json' }
	});
	await expect(
		POST({ locals: { pool: {}, user }, request: malformed } as never)
	).rejects.toMatchObject({ status: 400 });
});

test('maps only typed service errors to stable HTTP responses', async () => {
	executeContainerCopy.mockRejectedValueOnce(new ContainerCopyServiceError('source_unavailable'));
	await expect(POST(event(validRequest))).rejects.toMatchObject({ status: 404 });

	const unrelatedError = Object.assign(new Error('database failure'), {
		code: 'source_unavailable'
	});
	executeContainerCopy.mockRejectedValueOnce(unrelatedError);
	await expect(POST(event(validRequest))).rejects.toBe(unrelatedError);
});

test('maps copy-plan failures to the generic invalid-copy response', async () => {
	executeContainerCopy.mockRejectedValueOnce(new CopyPlanError('unsupported_copy_source'));

	await expect(POST(event(validRequest))).rejects.toMatchObject({ status: 422 });
});
