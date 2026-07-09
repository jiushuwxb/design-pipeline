import { Router } from 'express';
import { {{ModuleName}}Controller } from '../controllers/{{moduleName}}';

const router = Router();

router.get('/', {{ModuleName}}Controller.list);
router.get('/:id', {{ModuleName}}Controller.getById);
router.post('/', {{ModuleName}}Controller.create);
router.put('/:id', {{ModuleName}}Controller.update);
router.delete('/:id', {{ModuleName}}Controller.delete);

export default router;
