import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { connectDb } from "@/lib/mongodb";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { suggestEmailCorrection } from "@/utils/emailValidation";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Leading magic bytes for each permitted image format.
 * Checked against the raw buffer after upload to ensure the file content
 * matches its declared MIME type — MIME spoofing cannot bypass this.
 *
 * JPEG : FF D8 FF
 * PNG  : 89 50 4E 47  (‌\x89PNG)
 * WEBP : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  (RIFF????WEBP)
 */
const MAGIC_BYTES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png":  [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // bytes 8-11 in a WEBP file

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const getImageExtension = (mimeType) => {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
};

/**
 * Validates that the first bytes of a buffer match the expected magic
 * bytes for the given MIME type, preventing MIME-spoofed uploads.
 * @param {Buffer} buffer - File content buffer
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean} True if content matches the declared type
 */
const validateMagicBytes = (buffer, mimeType) => {
  const magic = MAGIC_BYTES[mimeType];
  if (!magic || buffer.length < magic.length) return false;

  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }

  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    for (let i = 0; i < WEBP_MARKER.length; i++) {
      if (buffer[8 + i] !== WEBP_MARKER[i]) return false;
    }
  }

  return true;
};

export async function POST(req) {
  try {
    // 1. Authenticate Request
    const authorization = req.headers.get("authorization");
    const token = authorization?.split(" ")[1];

    if (!token) {
      return jsonError("Unauthorized: No token provided", 401);
    }

    const authResult = await verifyFirebaseToken(token);

    if (!authResult.valid) {
      return jsonError(
        { message: "Unauthorized", reason: authResult.reason },
        401
      );
    }

    const decodedToken = authResult.decodedToken;

    const formData = await req.formData();
    const name   = normalizeText(formData.get("name"));
    const rollNo = normalizeText(formData.get("rollNo"));
    const email  = normalizeText(formData.get("email")).toLowerCase();
    const file   = formData.get("photo");

    if (!name || !rollNo || !email || !file) {
      return jsonError("Name, rollNo, email, and photo are required", 400);
    }

    if (!EMAIL_PATTERN.test(email)) {
      const suggestion = suggestEmailCorrection(email);
      const errorMessage = suggestion
        ? `Invalid email format. Did you mean ${suggestion}?`
        : "Invalid email format.";
      return jsonError(errorMessage, 400);
    }

    // 2. Validate MIME type against the allowlist before touching the bytes
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return jsonError(
        `File type '${file.type}' is not allowed. Accepted types: JPEG, PNG, WEBP.`,
        415
      );
    }

    // 3. Reject oversized files before buffering to prevent OOM
    if (file.size > MAX_FILE_SIZE) {
      return jsonError(
        `File too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
        413
      );
    }

    // 4. Prevent arbitrary registrations — must register own email
    if (decodedToken.email !== email) {
      return jsonError(
        "Forbidden: Cannot register face for a different user",
        403,
      );
    }

    // Get DB
    const db = await connectDb();
    const users = db.collection("users");

    // Check if user already registered
    const existingUser = await users.findOne({
      $or: [{ rollNo }, { email }],
    });
    if (existingUser) {
      return jsonError("User already registered with a photo", 409);
    }

    // 5. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Re-verify size against actual buffer length — file.size is client-supplied
    //    and can be spoofed; the buffer is authoritative
    if (buffer.length > MAX_FILE_SIZE) {
      return jsonError(
        `File too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
        413
      );
    }

    // 7. Validate magic bytes — ensures binary content matches the declared MIME type
    if (!validateMagicBytes(buffer, file.type)) {
      return jsonError(
        "File content does not match the declared type. Please upload a valid image.",
        415
      );
    }

    // Generate unique filename
    const safeName      = name.replace(/[^a-zA-Z0-9_-]/g, "_") || "user";
    const fileExtension = getImageExtension(file.type);
    const fileName      = `labels/${safeName}/${randomUUID()}.${fileExtension}`;

    // Upload to Vercel Blob
    const blob = await put(fileName, buffer, {
      contentType: file.type,
      access: "public",
    });

    // Save user record in DB
    const user = {
      name,
      rollNo,
      email,
      image: blob.url,
    };
    const result = await users.insertOne(user);

    return jsonSuccess(
      {
        message: "User registered successfully",
        user: {
          _id: result.insertedId,
          name: user.name,
          rollNo: user.rollNo,
          email: user.email,
        },
      },
      201,
    );
  } catch (error) {
    // Suppress console logging in production
    // Return generic error to client to prevent information disclosure
    const statusCode = error.code === 11000 ? 409 : 500;
    const clientMessage =
      error.code === 11000
        ? "This email is already registered"
        : "Registration failed. Please try again later.";

    return jsonError(clientMessage, statusCode);
  }
}
