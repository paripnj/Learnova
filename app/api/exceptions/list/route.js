import { connectDb } from "@/lib/mongodb";
import { verifyFirebaseToken, getUserProfile } from "@/lib/firebase-admin";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { escapeRegex, sanitizeSortField } from "@/utils/mongoUtils";

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "status",
  "date",
  "studentEmail",
  "reason",
]);

export async function GET(request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.split(" ")[1];
    const authResult = await verifyFirebaseToken(token);

    if (!authResult.valid) {
      return jsonError(
        { message: "Unauthorized", reason: authResult.reason },
        401
      );
    }

    const decodedToken = authResult.decodedToken;
    const profile = await getUserProfile(decodedToken.uid);

    if (!profile) {
      return jsonError("User profile not found", 404);
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );

    // Search
    const search = searchParams.get("search") || "";

    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Validation
    if (page < 1 || limit < 1) {
      return jsonError("Page and limit must be greater than 0", 400);
    }

    // FIX: Removed duplicate `const skip` declaration — only declared once here
    const skip = (page - 1) * limit;

    const db = await connectDb();
    const collection = db.collection("exceptions");

    // Base query
    const query = {
      status: "pending",
    };

    // Role-based filtering
    if (profile.role === "student") {
      query.studentEmail = decodedToken.email;
    } else if (profile.role !== "admin" && profile.role !== "teacher") {
      return jsonError("Forbidden", 403);
    }

    // Search filter
    if (search) {
      query.$or = [
        {
          reason: {
            $regex: search,
            $options: "i",
          },
        },
        {
          studentEmail: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Total count
    const total = await collection.countDocuments(query);

    // Fetch data
    const exceptions = await collection
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = Math.ceil(total / limit);

    // FIX: Moved 200 outside the object — it's the second argument to jsonSuccess, not a property
    return jsonSuccess(
      {
        exceptions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
        },
      },
      200
    );
  } catch (error) {
    return jsonError("Internal server error", 500);
  }
}
