import { Router } from 'express';
import {
  getAllProperties,
  getSingleProperty,
  leaseProperty
} from '../../../controller/v1/user/property.js';

const router = Router();

router.get('/properties', getAllProperties);
router.get('/properties/:id', getSingleProperty);
router.post('/properties/:id/lease', leaseProperty)

export default router;
