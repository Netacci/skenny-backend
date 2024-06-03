import { Router } from 'express';

import {
  register,
  login,
  changePassword,
  verifyEmail,
  resetPassword,
  forgotPassword,
  logout,
  editProfile,
  deleteRealtorProfile,
} from '../../controller/realtor/auth.js';
import authenticate from '../../middleware/authenticate.js';

const router = Router();

router.post('/register', register);

router.post('/login', login);

router.put('/change-password', authenticate, changePassword);

router.put('/verify-email', verifyEmail);

router.put('/reset-password', resetPassword);

router.put('/forgot-password', forgotPassword);

router.put('/logout', logout);

router.put('/edit-profile', authenticate, editProfile);

router.delete('/delete-realtor-profile', authenticate, deleteRealtorProfile);

export default router;
