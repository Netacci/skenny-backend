import Admin from '../../../models/v1/admin/auth.js';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../../../utils/emails.js';
import jwt from 'jsonwebtoken';
import { checkAdminStatus } from '../../../daos/superadmin-dao.js';

/**
 * Adds a new admin to the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body containing the admin's information.
 * @param {string} req.body.first_name - The first name of the admin.
 * @param {string} req.body.last_name - The last name of the admin.
 * @param {string} req.body.email - The email of the admin.
 * @param {string} req.body.role - The role of the admin.
 * @param {Object} res - The response object.
 * @return {Promise<void>} - A promise that resolves when the admin is added successfully.
 */
const addAdmin = async (req, res) => {
  const { first_name, last_name, email, role } = req.body;

  try {
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }
    if (!first_name || !last_name || !email || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: `Email ${email} already exists` });
    }
    let password = Math.random().toString(36).substring(7);
    let hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      first_name,
      last_name,
      email,
      role,
      password: hashedPassword,
    });
    await admin.save();
    const subject = 'New Admin Added';

    const dynamicData = {
      first_name: admin.first_name,
      admin_password: password,
      subject,
    };
    const templateId = process.env.SENDGRID_TEMPLATE_ID_ADMIN;
    await sendEmail(admin.email, templateId, subject, dynamicData);
    res.status(201).json({
      message: 'Admin added successfully',
      status: 201,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.error('Error:', err.response ? err.response.body : err.message);
  }
};

/**
 * Logs in an admin user.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body containing the admin's email and password.
 * @param {string} req.body.email - The email of the admin.
 * @param {string} req.body.password - The password of the admin.
 * @param {Object} res - The response object.
 * @return {Promise<void>} - A promise that resolves when the admin is logged in successfully.
 */
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const admin = await Admin.findOne({ email });

    const isPasswordCorrect = await bcrypt.compare(password, admin.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { _id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );
    admin.token = token;
    await admin.save();
    res
      .status(200)
      .json({ data: admin, token, message: 'Login successful', status: 200 });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
      res.status(400).json({ message: 'All fields are required' });
    }

    const match = await bcrypt.compare(oldPassword, req.user.password);
    if (!match) {
      res.status(401).json({ message: 'Invalid credential' });
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
 * Retrieves all admins from the database and sends them as a response.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Promise<void>} - A promise that resolves when the admins are fetched and sent as a response.
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password -__v -token');
    res
      .status(200)
      .json({ admins, message: 'Admins fetched successfully', status: 200 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const singleAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await Admin.findById(id);
    res
      .status(200)
      .json({ admin, message: 'Admin fetched successfully', status: 200 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Updates an admin's information in the database.
 *
 * @param {Object} req - The request object containing the admin's information.
 * @param {Object} req.params - The parameters object from the request.
 * @param {string} req.params.id - The ID of the admin to be updated.
 * @param {Object} req.body - The request body containing the updated admin information.
 * @param {string} req.body.first_name - The updated first name of the admin.
 * @param {string} req.body.last_name - The updated last name of the admin.
 * @param {string} req.body.role - The updated role of the admin.
 * @param {string} req.body.email - The updated email of the admin.
 * @param {Object} res - The response object.
 * @param {Object} req.user - The user object from the request, representing the authenticated user.
 * @return {Promise<void>} - A promise that resolves when the admin is updated successfully.
 *                          Returns a JSON object with an error message and the status code 401 if the user is not authorized.
 *                          Returns a JSON object with an error message and the status code 400 if the email cannot be changed.
 *                          Returns a JSON object with the updated admin, a success message, and the status code 200 if the admin is updated successfully.
 *                          Returns a JSON object with an error message and the status code 500 if there is an internal server error.
 */
const editAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const { first_name, last_name, role, email } = req.body;

    // only super admin can edit admin
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }
    if (email) {
      return res.status(400).json({ message: 'Email cannot be changed' });
    }
    const admin = await Admin.findByIdAndUpdate(
      id,
      { first_name, last_name, role },
      { new: true }
    ).select('-password -__v');

    res
      .status(result.code)
      .json({ admin, message: 'Admin updated successfully', status: 200 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Deletes an admin by their ID from the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.params - The parameters object from the request.
 * @param {string} req.params.id - The ID of the admin to delete.
 * @param {Object} res - The response object.
 * @param {Object} req.user - The user object from the request, representing the authenticated user.
 * @throws {Error} If the user is not authorized to delete an admin or if there is an error deleting the admin from the database.
 * @returns {Promise<void>} - A promise that resolves when the admin is deleted successfully.
 */
const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // only super admin can delete admin
    const result = await checkAdminStatus(req.user.role);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Unauthorized' });
    }
    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res
      .status(result.code)
      .json({ message: 'Admin deleted successfully', status: 200 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  addAdmin,
  login,
  getAllAdmins,
  editAdmin,
  deleteAdmin,
  changePassword,
  singleAdmin,
};
