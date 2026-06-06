const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Auth Routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Check-ins (Publicly accessible for visitors to register)
router.post('/checkins', visitController.createCheckin);
router.get('/checkins/:id/status', visitController.getVisitStatus);
router.put('/checkins/:id/request-checkout', visitController.requestCheckout);
router.get('/search-visitor/:idNumber', visitController.searchVisitor);

// Guard Routes (Requires login)
router.get('/checkins', authMiddleware, visitController.getCheckins);
router.get('/checkout-requests', authMiddleware, visitController.getCheckoutRequests);
router.put('/checkins/:id/approve', authMiddleware, visitController.approveCheckin);
router.put('/checkins/:id/reject', authMiddleware, visitController.rejectCheckin);

// Active Visitors
router.get('/active', authMiddleware, visitController.getActiveVisitors);
router.put('/active/:id/checkout', authMiddleware, visitController.checkoutVisitor);

// History
router.get('/history', authMiddleware, visitController.getHistory);

// System
router.post('/reset', authMiddleware, visitController.resetSystem);

module.exports = router;
