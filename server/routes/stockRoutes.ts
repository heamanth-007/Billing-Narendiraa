import { Router } from 'express';
import { getStockList, adjustStock, getStockHistory, bulkUpdateStock } from '../controllers/stockController';

const router = Router();

router.route('/').get(getStockList);
router.route('/adjust').post(adjustStock);
router.route('/history').get(getStockHistory);
router.route('/bulk').post(bulkUpdateStock);

export default router;
