import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { error, json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { _, unwrapFunctionStore } from 'svelte-i18n';

function objectURL(endpoint: string, forcePathStyle: boolean, bucket: string, key: string) {
	const url = new URL(endpoint);

	if (forcePathStyle) {
		url.pathname = `/${bucket}/${key}`;
	} else {
		url.hostname = `${bucket}.${url.hostname}`;
		url.pathname = `/${key}`;
	}

	return url.toString();
}

export const POST = (async ({ request, locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const client = new S3Client({
		credentials: {
			accessKeyId: env.SCW_API_ACCESS_KEY ?? '',
			secretAccessKey: env.SCW_API_SECRET_KEY ?? ''
		},
		endpoint: env.S3_ENDPOINT ?? '',
		forcePathStyle: Boolean(env.S3_FORCE_PATH_STYLE),
		region: env.SCW_REGION
	});

	const data = Object.fromEntries(await request.formData());
	const putCommand = new PutObjectCommand({
		Bucket: env.S3_BUCKET_NAME,
		Key: uuidv4(),
		ACL: 'public-read',
		Body: Buffer.from(await (data.upload as Blob).arrayBuffer()),
		ContentType: (data.upload as File).type,
		Tagging: `uploaded-by=${locals.user.guid}`
	});

	const result = await client.send(putCommand);

	return json('', {
		status: 201,
		headers: {
			...(result.ETag ? { ETag: result.ETag } : undefined),
			Location: objectURL(
				env.S3_ENDPOINT ?? '',
				client.config.forcePathStyle,
				putCommand.input.Bucket as string,
				putCommand.input.Key as string
			)
		}
	});
}) satisfies RequestHandler;
