import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { error, json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { _, unwrapFunctionStore } from 'svelte-i18n';

export const POST = (async ({ request, locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const client = new S3Client({
		credentials: {
			accessKeyId: env.SCW_API_ACCESS_KEY as string,
			secretAccessKey: env.SCW_API_SECRET_KEY as string
		},
		endpoint: `https://s3.${env.SCW_REGION}.scw.cloud`,
		region: env.SCW_REGION
	});

	const data = Object.fromEntries(await request.formData());
	const putCommand = new PutObjectCommand({
		Bucket: env.SCW_BUCKET_NAME,
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
			Location: `https://${env.SCW_BUCKET_NAME}.s3.${env.SCW_REGION}.scw.cloud/${putCommand.input.Key}`
		}
	});
}) satisfies RequestHandler;
