import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/rbac";
import { withErrorHandler } from "@/lib/error-handler";
import {
  extractImageFileFromFormData,
  fetchAndValidateImage,
  getImageResponseHeaders,
  getUserImageFromDb,
  updateUserImageInDb,
  uploadAvatarToBlob,
} from "@/lib/images/imagesService";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const validation = getImageSchema.safeParse({ id });
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]?.message || "Invalid request parameter";
      throw new ValidationError(firstError);
    }

    // Authenticate the requester and capture the decoded token for ownership checks
    const decodedToken = await requireAuth(request);

    const db = await connectDb();
    const users = db.collection("users");

    const { ObjectId } = require("mongodb");
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new ValidationError("Invalid user id");
    }

    const user = await users.findOne(
      { _id: objectId },
      { projection: { image: 1, firebaseUid: 1 } }
    );

    if (!user || !user.image) {
      throw new NotFoundError("Image not found");
    }

    // Enforce object-level authorization: only the owner or privileged roles may fetch another user's image
    const ownerUid = user.firebaseUid || null;
    if (ownerUid && ownerUid !== decodedToken.uid) {
      try {
        // Allow admins or institute-level users to access other users' images
        await requireRole(request, ["admin", "institute"]);
      } catch (err) {
        throw new AppError("Forbidden: insufficient permissions to access requested image", 403);
      }
    } else if (!ownerUid && ownerUid !== decodedToken.uid) {
      // If there's no firebaseUid on the user doc, be conservative and deny access unless privileged
      try {
        await requireRole(request, ["admin", "institute"]);
      } catch (err) {
        throw new AppError("Forbidden: insufficient permissions to access requested image", 403);
      }
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(user.image);
    } catch {
      throw new ValidationError("Invalid image URL");
    }

    if (parsedUrl.protocol !== "https:") {
      throw new ValidationError("Image URL must use HTTPS");
    }

  await requireAuth(request);

  const imageUrl = await getUserImageFromDb({ id });
  const { imageBuffer, contentType } = await fetchAndValidateImage(imageUrl);

  return new NextResponse(imageBuffer, {
    status: 200,
    headers: getImageResponseHeaders(contentType),
  });
});

export const POST = withErrorHandler(async (request) => {
  const decodedToken = await requireAuth(request);

  const formData = await request.formData();
  const file = extractImageFileFromFormData(formData);

  const { blobUrl } = await uploadAvatarToBlob({
    file,
    uid: decodedToken.uid,
  });

  await updateUserImageInDb({
    firebaseUid: decodedToken.uid,
    imageUrl: blobUrl,
  });
    const rawFaceDescriptor = formData.get("faceDescriptor");
    let faceDescriptor = null;
    if (rawFaceDescriptor) {
      if (typeof rawFaceDescriptor !== "string" || rawFaceDescriptor.length > 20000) {
        throw new ValidationError("Face descriptor payload too large");
      }
      try {
        const parsed = JSON.parse(rawFaceDescriptor);
        const faceDescriptorSchema = z.array(z.number()).length(128);
        faceDescriptor = faceDescriptorSchema.parse(parsed);
      } catch {
        throw new ValidationError("Invalid face descriptor format");
      }
    }

    if (!file || typeof file === "string" || !file.type) {
      throw new ValidationError("File is required and must be a valid file");
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File size exceeds 5MB limit");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ValidationError("Invalid image type");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Vercel Blob
    const fileExtension = file.type.split("/")[1] || "jpg";
    const fileName = `avatars/${decodedToken.uid}-${randomUUID()}.${fileExtension}`;
    const blob = await put(fileName, buffer, {
      contentType: file.type,
      access: "public",
    });

    // Update in MongoDB if exists
    const db = await connectDb();
    const users = db.collection("users");
    const updatePayload = { image: blob.url };
    if (faceDescriptor) {
      updatePayload.faceDescriptor = faceDescriptor;
    }
    await users.updateOne(
      { firebaseUid: decodedToken.uid },
      { $set: updatePayload }
    );

  return NextResponse.json({ success: true, url: blobUrl });
});
