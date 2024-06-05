import { Router } from 'express';
import {
  getAllProperties,
  getSingleProperty,
} from '../../../controller/v1/user/property.js';

const router = Router();

router.get('/properties', getAllProperties);
router.get('/properties/:id', getSingleProperty);

export default router;
