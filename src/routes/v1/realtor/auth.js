import { Router } from 'express';

import {
  register,
  login,
  changePassword,
  verifyEmail,
  resetPassword,
  forgotPassword,
  editProfile,
  deleteRealtorProfile,
} from '../../../controller/v1/realtor/auth.js';
import authenticate from '../../../middleware/authenticate.js';
import { loginLimiter } from '../../../middleware/rateLimiting.js';

const router = Router();

router.post('/register', register);

router.post('/login', loginLimiter, login);

router.put('/change-password', authenticate('realtor'), changePassword);

router.put('/verify-email', verifyEmail);

router.put('/reset-password', resetPassword);

router.put('/forgot-password', forgotPassword);

router.put('/edit-profile', authenticate('realtor'), editProfile);

router.delete(
  '/delete-realtor-profile',
  authenticate('realtor'),
  deleteRealtorProfile
);

export default router;
