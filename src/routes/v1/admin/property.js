import { Router } from 'express';
import authenticate from '../../../middleware/authenticate.js';
import {
  getAllProperties,
  getAllRealtors,
  getSingleProperty,
  getSingleRealtor,
  deleteRealtor,
  deleteProperty,
  banRealtor,
  changePropertyStatus,
} from '../../../controller/v1/admin/property.js';

const router = Router();

router.get('/properties', authenticate('admin'), getAllProperties);
router.get('/realtors', authenticate('admin'), getAllRealtors);
router.get('/property/:id', authenticate('admin'), getSingleProperty);
router.get('/realtor/:id', authenticate('admin'), getSingleRealtor);
router.delete('/realtor/:id', authenticate('admin'), deleteRealtor);
router.delete('/property/:id', authenticate('admin'), deleteProperty);
router.put('/realtor/:id', authenticate('admin'), banRealtor);
router.put('/property/:id', authenticate('admin'), changePropertyStatus);

export default router;
