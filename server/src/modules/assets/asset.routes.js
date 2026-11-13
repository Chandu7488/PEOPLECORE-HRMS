import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  createAssetController,
  getAssetsController,
  allocateAssetController,
  returnAssetController,
} from './asset.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.ASSETS_READ_SELF), getAssetsController);
router.post('/', requirePermission(PERMISSIONS.ASSETS_MANAGE), createAssetController);
router.put('/:id/allocate', requirePermission(PERMISSIONS.ASSETS_MANAGE), allocateAssetController);
router.put('/:id/return', requirePermission(PERMISSIONS.ASSETS_MANAGE), returnAssetController);

export { router as assetRoutes };
export default router;
