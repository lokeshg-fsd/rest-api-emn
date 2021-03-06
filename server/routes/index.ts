import express from 'express'

// TODO Update no-duplicate-imports config to use separate imports for values and types
// eslint-disable-next-line no-duplicate-imports
import type { Request, Response, Router } from 'express'

import UserControllers from '../controllers/UserController'

const router: Router = express.Router()

// Post Method
router.post('/post', (req: Request, res: Response) => {
  res.send('Post API')
})

// Get all Method
router.get('/getAll', (req: Request, res: Response) => {
  res.send('Get All API')
})

// Get by ID Method
router.get('/getOne/:id', (req: Request, res: Response) => {
  res.send('Get by ID API')
})

// Update by ID Method
router.patch('/update/:id', (req: Request, res: Response) => {
  res.send('Update by ID API')
})

// Delete by ID Method
router.delete('/delete/:id', (req: Request, res: Response) => {
  res.send('Delete by ID API')
})

router.use('/users', UserControllers)

export default router
