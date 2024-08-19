import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';

export async function sendVerificationEmail(email: string, profileURL: string) {
	const transport = nodemailer.createTransport({
		auth: {
			user: privateEnv.SMTP_AUTH_USERNAME,
			pass: privateEnv.SMTP_AUTH_PASSWORD
		},
		host: env.PUBLIC_SMTP_HOST,
		logger: true,
		port: parseInt(env.PUBLIC_SMTP_PORT),
		secure: Boolean(env.PUBLIC_SMTP_SECURE)
	} as SMTPTransport.Options);

	return await transport.sendMail({
		from: 'knot dots <no-reply@knotdots.net>',
		subject: unwrapFunctionStore(_)('invite.email_subject'),
		text: unwrapFunctionStore(_)('invite.email_text', { values: { link: profileURL } }),
		to: email
	});
}
