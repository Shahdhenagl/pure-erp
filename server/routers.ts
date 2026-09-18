import { z } from "zod";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  media: router({
    uploadStoreImage: adminProcedure
      .input(z.object({ fileName: z.string().min(1).max(120), contentType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/), dataBase64: z.string().min(100).max(8_000_000) }))
      .mutation(async ({ input, ctx }) => {
        const data = Buffer.from(input.dataBase64, "base64");
        const uploaded = await storagePut(`store-assets/${ctx.user.id}-${input.fileName}`, data, input.contentType);
        return uploaded;
      }),
  }),
  store: router({
    notifyOrderCreated: publicProcedure
      .input(z.object({ businessName: z.string().min(1).max(120), phone: z.string().min(5).max(30), total: z.string().max(40) }))
      .mutation(async ({ input }) => {
        const { notifyOwner } = await import("./_core/notification");
        const delivered = await notifyOwner({
          title: "طلب متجر جديد",
          content: `طلب جديد من ${input.businessName} — ${input.phone} — الإجمالي ${input.total}`,
        });
        return { success: delivered } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
