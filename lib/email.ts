type SendEmailParams = {
    to: string;
    subject: string;
    text: string;
};

export async function sendEmail({ to, subject, text }: SendEmailParams) {
    if (process.env.NODE_ENV !== "production") {
        console.info("[dev:sendEmail]", { to, subject, text });
        return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        throw new Error("Missing RESEND_API_KEY or EMAIL_FROM for sendEmail.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: 'noreply@nxdus.space',
            to: [to],
            subject,
            text,
        }),
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(
            `Failed to send email: ${response.status} ${response.statusText} ${details}`.trim()
        );
    }
}
