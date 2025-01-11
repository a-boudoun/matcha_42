import { query } from "../config/db";
import cloudinary from "../config/cloudinary";
import { Response } from "express";
import {
  completeProfileReqeuest,
  isValidInterest,
  isValidPreference,
} from "../dtos/requests/completeProfileRequest";
import { AuthenticatedRequest } from "../middlewares/ahthenticatedRequest";
import bcrypt from "bcryptjs";

export const completeProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  console.log(req.user);

  try {
    const userData: completeProfileReqeuest = req.body;
    const userId: any = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    if (
      !userData.biography ||
      !userData.interests ||
      !userData.latitude ||
      !userData.longtitude ||
      !userData.preferences ||
      !userData.pictures ||
      !userData.profile_picture ||
      !userData.city ||
      !userData.country
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!isValidPreference(userData.preferences)) {
      return res.status(400).json({
        success: false,
        message: "invalid preference",
      });
    }

    const invalidInterests: string[] = userData.interests.filter(
      (interest) => !isValidInterest(interest)
    );

    if (invalidInterests.length > 0) {
      return res.status(400).json({
        error: "Invalid interests",
        invalidInterests,
      });
    }

    const result: any = await cloudinary.uploader.upload(
      userData.profile_picture
    );
    const profilePictureUrl: string = result.secure_url;

    const pictures_urls: string[] = [];
    for (const image of userData.pictures) {
      const imageResult: any = await cloudinary.uploader.upload(image);
      const imageUrl: string = imageResult.secure_url;
      pictures_urls.push(imageUrl);
    }

    await query("BEGIN");

    const insertUserInfoQuery = `
          UPDATE users
          SET biography = $1,
              latitude = $2,
              longtitude = $3,
              profile_completed = true,
              sexual_preferences = $4,
              profile_picture = $5,
              city = $6,
              country = $7
          WHERE id = $8;
        `;
    await query(insertUserInfoQuery, [
      userData.biography,
      userData.latitude,
      userData.longtitude,
      userData.preferences,
      profilePictureUrl,
      userData.city,
      userData.country,
      userId,
    ]);

    const insertUserImagesQuery = `
          INSERT INTO pictures (user_id, picture_url)
          VALUES ($1, unnest($2::text[]));
        `;
    await query(insertUserImagesQuery, [userId, pictures_urls]);

    const insertUserInterestsQuery = `
            INSERT INTO interests (user_id, interest_id)
            SELECT $1, id
            FROM interest_tags
            WHERE tag = ANY($2::text[])
            ON CONFLICT DO NOTHING;
        `;
    await query(insertUserInterestsQuery, [userId, userData.interests]);

    await query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Profile completed successfully",
    });
  } catch (ex) {
    console.error("Error completing profile:", ex);

    await query("ROLLBACK");

    return res.status(500).json({
      success: false,
      message: "An error occurred while completing the profile",
    });
  }
};

// export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
// // TODO: Implement updateProfile
// };

export const updateEmail = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { email, password } = req.body;
    const userId = req.user?.id;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const checkEmailQuery: string = `
      SELECT id FROM users
      WHERE email = $1;
    `;

    const { rows: checkEmail } = await query(checkEmailQuery, [email]);

    if (checkEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const getPasswordQuery: string = `
      SELECT password FROM users
      WHERE id = $1;
    `;
    const { rows } = await query(getPasswordQuery, [userId]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const userPassword: string = rows[0].password;

    const isMatch: boolean = await bcrypt.compare(password, userPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const updateEmailQuery: string = `
      UPDATE users
      SET email = $1
      WHERE id = $2;
    `;
    await query(updateEmailQuery, [email, userId]);

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (ex) {
    console.error("Error updating email:", ex);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the email",
    });
  }
};

export const updatePassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const getPasswordQuery: string = `
      SELECT password FROM users
      WHERE id = $1;
    `;
    const { rows } = await query(getPasswordQuery, [userId]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const userPassword: string = rows[0].password;

    const isMatch: boolean = await bcrypt.compare(oldPassword, userPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const hashedPassword: string = await bcrypt.hash(newPassword, 10);

    const updatePasswordQuery: string = `
      UPDATE users
      SET password = $1
      WHERE id = $2;
    `;
    await query(updatePasswordQuery, [hashedPassword, userId]);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (ex) {
    console.error("Error updating password:", ex);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the password",
    });
  }
};
