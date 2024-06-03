import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import Realtor from '../../models/realtor/auth.js';
import { sendEmail } from '../../utils/emails.js';

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
    const link = `http://localhost:5174/email/confirm/${verificationToken}`;

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
const editProfile = async (req, res) => {
  try {
    const realtor = await Realtor.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
    });

    res
      .status(200)
      .json({ data: realtor, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const match = await bcrypt.compare(oldPassword, req.user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credential' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    req.user.password = hashedPassword;
    await req.user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const realtor = await Realtor.findOne({ email });

    if (!realtor) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!realtor.is_email_verified) {
      return res.status(400).json({ message: 'Email not verified' });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    realtor.verificationToken = token;
    await realtor.save();
    const subject = 'Password reset request';
    const templateId = process.env.SENDGRID_TEMPLATE_ID_RESET;
    const link = `http://localhost:5174/reset-password/${token}`;
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
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const deleteRealtorProfile = async (req, res) => {
  try {
    await Realtor.findByIdAndDelete(req.user._id);
    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const logout = async (req, res) => {
  try {
    req.user.auth.token = null;
    await req.user.save();
    res.status(200).json({ message: 'Logout successful' });
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
  logout,
  editProfile,
  deleteRealtorProfile,
};
