import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const executeContainerCopy = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/containerCopyService', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCopyService')>()),
	executeContainerCopy
}));

import { payloadTypes } from '$lib/models';
import { ContainerCopyServiceError } from '$lib/server/containerCopyService';
import { POST } from './+server';

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

beforeEach(() => executeContainerCopy.mockReset());

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
