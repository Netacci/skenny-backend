import { Router } from 'express';
import {
  getAllProperties,
  getSingleProperty,
  addProperty,
  editProperty,
  deleteProperty,
  uploadPropertyImages,
  deleteTenancyRequest,
  approveTenancyRequest,
} from '../../../controller/v1/realtor/property.js';
import authenticate from '../../../middleware/authenticate.js';
import {
  uploadSingleFile,
  uploadMultipleFiles,
} from '../../../utils/upload.js';

const router = Router();

router.post('/add', authenticate('realtor'), addProperty);
router.get('/', authenticate('realtor'), getAllProperties);
router.put('/:id', authenticate('realtor'), editProperty);
router.delete('/:id', authenticate('realtor'), deleteProperty);
router.get('/:id', authenticate('realtor'), getSingleProperty);
router.delete('/:propertyId/tenancy-requests/:requestId', authenticate('realtor'), deleteTenancyRequest);
router.post('/:propertyId/tenancy-requests/:requestId/approve', authenticate('realtor'), approveTenancyRequest);
router.post(
  '/upload',
  authenticate('realtor'),
  uploadSingleFile,
  uploadPropertyImages
);
router.post(
  '/uploads',
  authenticate('realtor'),
  uploadMultipleFiles,
  uploadPropertyImages
);

export default router;
