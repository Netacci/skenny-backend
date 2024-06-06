import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import Realtor from '../../../models/v1/realtor/auth.js';
import { sendEmail } from '../../../utils/emails.js';

/**
 * Registers a new realtor in the system.
 *
 * @param {Object} req - The request object containing the realtor's information.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the realtor is successfully registered.
 */
const register = async (req, res) => {
  const { first_name, last_name, email, password, phone_number, account_type } =
    req.body;
  try {
    if (
      !first_name ||
      !last_name ||
      !email ||
      !password ||
      !phone_number ||
      !account_type
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existingRealtor = await Realtor.findOne({ email });
    if (existingRealtor) {
      return res.status(400).json({ message: `Email ${email} already exists` });
    }
    const existingPhoneNumber = await Realtor.findOne({ phone_number });
    if (existingPhoneNumber) {
      return res.status(400).json({
        message: `Phone number ${phone_number} already exists`,
      });
    }

    const verificationToken = jwt.sign(
      { email: email },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const realtor = await Realtor.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      phone_number,
      account_type,
      verificationToken,
      is_email_verified: false,
    });
    await realtor.save();
    // env variable to check of on local host or render
    const hostlink =
      process.env.NODE_ENV === 'production'
        ? 'https://skenny.org'
        : 'http://localhost:5174';
    const link = `${hostlink}/email/confirm/${verificationToken}`;

    const subject = 'Verify your email to complete registration';
    const dynamicData = {
      first_name: realtor.first_name,
      verification_link: link,
      subject: subject,
    };
    const templateId = process.env.SENDGRID_TEMPLATE_ID;
    await sendEmail(realtor.email, templateId, subject, dynamicData);
    res.status(201).json({
      message: 'Realtor created successfully',
      token: verificationToken,
      status: 201,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * Verifies the email of a realtor using a JWT token.
 *
 * @param {Object} req - The request object containing the JWT token in the body.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the email is successfully verified.
 *                            Returns a JSON object with the verified realtor data, the token,
 *                            a success message, and the status code 201 if successful.
 *                            Returns a JSON object with an error message and the status code 404
 *                            if the realtor is not found.
 *                            Returns a JSON object with an error message and the status code 400
 *                            if the email is already verified.
 *                            Returns a JSON object with an error message and the status code 401
 *                            if the token is invalid or expired.
 *                            Returns a JSON object with an error message and the status code 500
 *                            if there is an internal server error.
 */
const verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const realtor = await Realtor.findOne({ email: decoded.email });
    if (!realtor) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (realtor.is_email_verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    if (token !== realtor.verificationToken) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    realtor.auth.token = token;
    realtor.is_email_verified = true;
    realtor.verificationToken = undefined;
    await realtor.save();
    res.status(201).json({
      data: realtor,
      token,
      message: 'Email verified successfully',
      status: 201,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * Logs in a realtor by verifying their email and password.
 *
 * @param {Object} req - The request object containing the email and password in the body.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the realtor is successfully logged in.
 *                           The response contains the realtor's data, a token, and a success message.
 * @throws {Error} - If any of the required fields are missing or if the email or password is invalid.
 */
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const realtor = await Realtor.findOne({ email });
    if (!realtor) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!realtor.is_email_verified) {
      return res.status(401).json({ message: 'Email not verified' });
    }
    // if a realtor is banned they can't create property
    if (realtor.isBanned) {
      return res
        .status(403)
        .json({ message: 'You are banned, contact admin', status: 403 });
    }
    const isPasswordCorrect = await bcrypt.compare(password, realtor.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // For login can we use the same token gotten during registration or we have to generate a new token
    const token = jwt.sign(
      { _id: realtor.id, email: realtor.email },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );
    realtor.auth.token = token;
    await realtor.save();
    res
      .status(200)
      .json({ data: realtor, token, message: 'Login successful', status: 200 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * Updates the profile of a realtor in the system.
 *
 * @param {Object} req - The request object containing the realtor's updated information.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the realtor's profile is successfully updated.
 */
const editProfile = async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    address,
    country,
    state,
    account_type,
    email,
    password,
  } = req.body;

  try {
    const value = account_type || email || password;
    if (value) {
      return res
        .status(500)
        .json({ message: `Not allowed to change this value ${value}` });
    }

    const realtor = await Realtor.findByIdAndUpdate(
      req.user._id,
      {
        first_name,
        last_name,
        phone_number,
        address,
        country,
        state,
      },
      { new: true }
    );

    res
      .status(200)
      .json({ data: realtor, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * Changes the password of a user.
 *
 * @param {Object} req - The request object containing the user's old password and new password in the body.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the password is successfully changed.
 *                            Returns a JSON object with a success message and the status code 200 if successful.
 *                            Returns a JSON object with an error message and the status code 400 if the old password or new password is missing.
 *                            Returns a JSON object with an error message and the status code 401 if the old password is invalid.
 *                            Returns a JSON object with an error message and the status code 500 if there is an internal server error.
 */
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (oldPassword === newPassword) {
      return res
        .status(401)
        .json({ message: 'New password cannot be the same as old password' });
    }
    const match = await bcrypt.compare(oldPassword, req.user.password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    req.user.password = hashedPassword;
    await req.user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Sends a password reset link to the specified email address.
 *
 * @param {Object} req - The request object containing the email address.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the password reset link is sent successfully.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const realtor = await Realtor.findOne({ email });
    // Mask this error message for security reasons. When user isnt find still send Email sent to user message. This can be revisited and changed later
    if (!realtor) {
      return res.status(200).json({ message: 'Email sent to user' });
    }
    if (!realtor.is_email_verified) {
      return res.status(400).json({ message: 'Email not verified' });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    realtor.verificationToken = token;
    const hostlink =
      process.env.NODE_ENV === 'production'
        ? 'https://skenny.org'
        : 'http://localhost:5174';
    await realtor.save();
    const subject = 'Password reset request';
    const templateId = process.env.SENDGRID_TEMPLATE_ID_RESET;
    const link = `${hostlink}/reset-password/${token}`;
    const dynamicData = {
      verification_link: link,
      subject: subject,
    };

    await sendEmail(realtor.email, templateId, subject, dynamicData);
    res.status(200).json({
      message: 'Password reset link sent to your email',
      token,
      status: 200,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * Resets the password of a user given a valid token.
 *
 * @param {Object} req - The request object containing the password and token.
 * @param {Object} res - The response object.
 * @return {Promise<void>} - A promise that resolves when the password is successfully changed.
 *                          - A 404 status code and message if the user is not found.
 *                          - A 500 status code and message if there is an error.
 */
const resetPassword = async (req, res) => {
  const { password, token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const realtor = await Realtor.findOne({ email: decoded.email });
    if (!realtor) {
      return res.status(404).json({ message: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    realtor.password = hashedPassword;
    realtor.verificationToken = undefined;
    await realtor.save();
    // TODO Send out email to notifiy user that passssword has been reset
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Deletes the realtor's profile.
 *
 * @param {Object} req - The request object containing the user's ID.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the profile is successfully deleted.
 *                            Returns a JSON object with a success message and the status code 200 if successful.
 *                            Returns a JSON object with an error message and the status code 500 if there is an internal server error.
 */
const deleteRealtorProfile = async (req, res) => {
  try {
    await Realtor.findByIdAndDelete(req.user._id);
    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  register,
  login,
  changePassword,
  verifyEmail,
  resetPassword,
  forgotPassword,
  editProfile,
  deleteRealtorProfile,
};
