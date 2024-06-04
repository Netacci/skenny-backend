import { Router } from 'express';
import {
  getAllProperties,
  getSingleProperty,
} from '../../controller/user/property.js';

const router = Router();

router.get('/properties', getAllProperties);
router.get('/properties/:id', getSingleProperty);

export default router;
