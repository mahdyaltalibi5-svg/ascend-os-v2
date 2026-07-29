import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { normalizeEmail } from "@/lib/utils";
import { signInSchema } from "@/lib/validation/auth";
import { writeAuditEvent } from "@/lib/server/audit";
import { verifyPassword } from "@/lib/server/crypto";
import { prisma } from "@/lib/server/db";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30
  },
  pages: {
    signIn: "/signin"
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const normalizedEmail = normalizeEmail(parsed.data.email);
        const rateLimitKey = `signin:${normalizedEmail}`;
        const registerFailedAttempt = () => checkRateLimit(rateLimitKey, 8, 60_000);

        const user = await prisma.user.findUnique({
          where: { normalizedEmail }
        });

        if (!user) {
          registerFailedAttempt();
          return null;
        }

        const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!validPassword) {
          registerFailedAttempt();
          return null;
        }

        await writeAuditEvent({
          actorUserId: user.id,
          action: "user.signed_in",
          entityType: "User",
          entityId: user.id
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    }
  }
};

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
