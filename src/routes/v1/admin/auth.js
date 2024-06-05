import { Router } from 'express';

import {
  addAdmin,
  login,
  changePassword,
  getAllAdmins,
  editAdmin,
  deleteAdmin,
  singleAdmin,
} from '../../../controller/v1/admin/auth.js';
import authenticate from '../../../middleware/authenticate.js';

const router = Router();

router.post('/', authenticate('admin'), addAdmin);
router.post('/login', login);
router.put('/change-password', authenticate('admin'), changePassword);
router.get('/all-admins', authenticate('admin'), getAllAdmins);
router.put('/:id', authenticate('admin'), editAdmin);
router.delete('/:id', authenticate('admin'), deleteAdmin);
router.get('/:id', authenticate('admin'), singleAdmin);

export default router;
