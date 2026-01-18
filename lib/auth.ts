import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    trustedOrigins: ["http://localhost:3000", "https://dash.nxdus.space"],
    baseURL: process.env.BETTER_AUTH_URL as string,
    secret: process.env.BETTER_AUTH_SECRET as string,
    plugins: [nextCookies()],
    session: {
        expiresIn: 60 * 60 * 2,
        updateAge: 60 * 30,
        freshAge: 60 * 10,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 2,
            strategy: "jwe",
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignIn: true,
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            void sendEmail({
                to: user.email,
                subject: "Verify your email address",
                text: `Click the link to verify your email: ${url}`,
            });
        },
    },
    socialProviders: {
        google: {
            accessType: "offline",
            prompt: "select_account consent",
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string"
            }
        }
    }
});
