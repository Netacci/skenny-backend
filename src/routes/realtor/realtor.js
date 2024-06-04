import { Router } from 'express';
import {
  getAllProperties,
  getSingleProperty,
  addProperty,
  editProperty,
  deleteProperty,
  uploadPropertyImages,
} from '../../controller/realtor/realtor.js';
import authenticate from '../../middleware/authenticate.js';
import { uploadFiles } from '../../utils/upload.js';

const router = Router();

router.post('/add', authenticate, addProperty);
router.get('/', authenticate, getAllProperties);
router.put('/:id', authenticate, editProperty);
router.delete('/:id', authenticate, deleteProperty);
router.get('/:id', authenticate, getSingleProperty);
router.post('/upload', authenticate, uploadFiles, uploadPropertyImages);

export default router;
