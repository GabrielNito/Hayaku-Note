import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  noteImageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(async () => {
      return { userId: "hayaku-user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completed for userId:", metadata.userId);
      console.log("file ufsUrl", file.ufsUrl);
      return { uploadedBy: metadata.userId, url: file.ufsUrl, ufsUrl: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
