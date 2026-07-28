import type { FocusBlock, OperatingNote, PersonalPriority } from "@prisma/client";

import { prisma } from "@/lib/server/db";

const urgencyRank: Record<string, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1
};

export type PersonalCommandData = {
  priorities: PersonalPriority[];
  completedToday: PersonalPriority[];
  notes: OperatingNote[];
  focusBlocks: FocusBlock[];
};

export async function getPersonalCommandData(input: {
  userId: string;
  organizationId: string;
}): Promise<PersonalCommandData> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [priorities, completedToday, notes, focusBlocks] = await prisma.$transaction([
    prisma.personalPriority.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: "OPEN"
      },
      orderBy: { createdAt: "desc" },
      take: 16
    }),
    prisma.personalPriority.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: "DONE",
        completedAt: { gte: startOfToday }
      },
      orderBy: { completedAt: "desc" },
      take: 4
    }),
    prisma.operatingNote.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.focusBlock.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: "PLANNED"
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return {
    priorities: priorities
      .sort((left, right) => {
        const urgencyDelta = urgencyRank[right.urgency] - urgencyRank[left.urgency];
        return urgencyDelta || right.createdAt.getTime() - left.createdAt.getTime();
      })
      .slice(0, 8),
    completedToday,
    notes,
    focusBlocks
  };
}
