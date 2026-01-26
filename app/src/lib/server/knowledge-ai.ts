import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
import { audience } from '$lib/models';

const startJobResponseSchema = z.object({ job_id: z.uuid(), job_url: z.string() });

const jobStatusResponseSchema = z.object({
	job_id: z.uuid(),
	status: z.enum(['pending', 'processing', 'completed', 'failed']),
	created_at: z.iso.datetime({ local: true }),
	updated_at: z.iso.datetime({ local: true }),
	data: z
		.object({
			knowledge_objects: z.array(
				z.object({
					audience: z.array(audience),
					category: z.array(z.string()),
					description: z.string(),
					policyFieldBNK: z.array(z.string()),
					summary: z.string(),
					title: z.string(),
					topic: z.array(z.string())
				})
			)
		})
		.nullable()
});

export async function startJob(file: File) {
	const formData = new FormData();
	formData.append('file', file);
	const response = await fetch((privateEnv.KNOWLEDGE_AI_URL as string) + '/ai-job', {
		body: formData,
		method: 'POST'
	});
	return startJobResponseSchema.safeParse(await response.json());
}

export async function pollJobStatus(id: string) {
	const response = await fetch((privateEnv.KNOWLEDGE_AI_URL as string) + '/ai-job/' + id);
	const payload = await response.json();
	return jobStatusResponseSchema.safeParse(payload);
}
