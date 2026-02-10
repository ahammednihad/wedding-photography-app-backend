const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const cors = require("cors");
const configureDB = require("./app/config/db");
const socket = require("./app/services/socket");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const router = express.Router();
const port = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());

// ==================== DB CONNECTION ====================
configureDB();

// ==================== IMPORT MIDDLEWARES ====================
const authenticateUser = require('./app/middlewares/authenticate');
const authorizeUser = require('./app/middlewares/authorizeUser');
const upload = require('./app/middlewares/upload');

// ==================== IMPORT CONTROLLERS ====================
const authController = require('./app/controllers/auth/auth-cntlr');
const publicController = require('./app/controllers/public/public-cntlr');
const adminController = require('./app/controllers/admin/admin-cntlr');
const clientController = require('./app/controllers/client/client-cntlr');
const photographerController = require('./app/controllers/photographer/photographer-cntlr');
const paymentController = require('./app/controllers/client/payment-cntlr');
const reviewController = require('./app/controllers/client/review-cntlr');
const uploadController = require('./app/controllers/photographer/upload-cntlr');
const availabilityController = require('./app/controllers/photographer/availability-cntlr');
const chatController = require('./app/controllers/common/chat-cntlr');

// ==================== API ROUTES ====================

// --- Welcome Route ---
router.get("/api", (req, res) => res.json({ message: "Welcome to WedLens API" }));

// --- Auth Routes ---
router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);

// --- Public Routes ---
router.get('/api/public/photographers', publicController.listPhotographers);
router.get('/api/public/photographers/:id', publicController.viewPhotographer);
router.post('/api/public/search', publicController.searchPhotographers);
router.get('/api/public/availability/:id', publicController.getAvailability);
router.get('/api/public/busy-slots/:id', publicController.getBusySlots);
router.get('/api/public/reviews/:id', publicController.getReviews);

// --- Admin Routes ---
const adminRouter = express.Router();
adminRouter.use(authenticateUser, authorizeUser(['admin']));
adminRouter.get('/dashboard/stats', adminController.getDashboardStats);
adminRouter.get('/profile', adminController.getProfile);
adminRouter.get('/users', adminController.listAllUsers);
adminRouter.get('/users/:id', adminController.getUserById);
adminRouter.put('/users/:id', adminController.updateUser);
adminRouter.put('/users/:id/block', adminController.blockUser);
adminRouter.put('/users/:id/unblock', adminController.unblockUser);
adminRouter.delete('/users/:id', adminController.deleteUser);
adminRouter.get('/bookings', adminController.listAllBookings);
adminRouter.get('/bookings/:id', adminController.getBookingById);
adminRouter.put('/bookings/:id/status', adminController.updateBookingStatus);
adminRouter.delete('/bookings/:id', adminController.deleteBooking);
adminRouter.get('/photographers', adminController.listPhotographers);
adminRouter.get('/photographers/pending', adminController.pendingPhotographers);
adminRouter.put('/photographers/:id/approve', adminController.approvePhotographer);
adminRouter.put('/photographers/:id/reject', adminController.rejectPhotographer);
adminRouter.put('/photographers/:id/block', adminController.blockPhotographer);
adminRouter.put('/photographers/:id/unblock', adminController.unblockPhotographer);
adminRouter.delete('/photographers/:id', adminController.deletePhotographer);
adminRouter.put('/bookings/:id/assign', adminController.assignPhotographer);
adminRouter.put('/bookings/:id/reassign', adminController.reassignPhotographer);
adminRouter.get('/payments', adminController.listAllPayments);
adminRouter.get('/payments/stats', adminController.getPaymentStats);
adminRouter.get('/conflicts', adminController.getBookingConflicts);
adminRouter.get('/activity', adminController.getActivityLogs);
router.use('/api/admin', adminRouter);

// --- Client Routes ---
const clientRouter = express.Router();
clientRouter.use(authenticateUser, authorizeUser(['client']));
clientRouter.get('/stats', clientController.getDashboardStats);
clientRouter.get('/photographers', clientController.listVerifiedPhotographers);
clientRouter.post('/bookings', clientController.createBooking);
clientRouter.get('/bookings', clientController.myBookings);
clientRouter.get('/bookings/:id', clientController.getBooking);
clientRouter.put('/bookings/:id', clientController.updateBooking);
clientRouter.put('/bookings/:id/cancel', clientController.cancelBooking);
clientRouter.post('/bookings/:id/payment', clientController.recordPayment);
clientRouter.get('/payments', clientController.getPaymentHistory);
clientRouter.get('/profile', clientController.getProfile);
clientRouter.put('/profile', clientController.updateProfile);
clientRouter.post('/reviews', reviewController.create);
clientRouter.get('/favorites', clientController.getFavorites);
clientRouter.post('/favorites', clientController.addFavorite);
clientRouter.delete('/favorites/:favoriteId', clientController.removeFavorite);
router.use('/api/client', clientRouter);

// --- Photographer Routes ---
const photographerRouter = express.Router();
photographerRouter.use(authenticateUser, authorizeUser(['photographer']));
photographerRouter.get('/stats', photographerController.getDashboardStats);
photographerRouter.get('/assignments', photographerController.listAssignments);
photographerRouter.put('/assignments/:id/accept', photographerController.acceptAssignment);
photographerRouter.put('/assignments/:id/decline', photographerController.declineAssignment);
photographerRouter.get('/schedule', photographerController.getSchedule);
photographerRouter.get('/completed', photographerController.getCompletedEvents);
photographerRouter.put('/bookings/:id/complete', photographerController.markEventCompleted);
photographerRouter.get('/earnings', photographerController.getEarnings);
photographerRouter.get('/bookings', photographerController.listBookings);
photographerRouter.get('/bookings/:id', photographerController.getBookingById);
photographerRouter.put('/bookings/:id/status', photographerController.updateBookingStatus);
photographerRouter.get('/profile', photographerController.getProfile);
photographerRouter.put('/profile', photographerController.updateProfile);
photographerRouter.post('/availability', availabilityController.set);
photographerRouter.post('/upload/avatar', upload.single('image'), uploadController.avatar);
photographerRouter.post('/upload/portfolio', upload.array('images', 10), uploadController.portfolio);
photographerRouter.delete('/upload/portfolio/:publicId', uploadController.deletePortfolioImage);
router.use('/api/photographer', photographerRouter);

// --- Common/Utility Routes ---
router.use('/api/chat', authenticateUser);
router.get('/api/chat/history/:bookingId', authenticateUser, chatController.getChatHistory);
router.post('/api/chat/send', authenticateUser, chatController.saveChat);
router.get('/api/chat/inbox/:id', authenticateUser, chatController.getInbox);

router.post('/api/payments/create-order', authenticateUser, authorizeUser(['client']), paymentController.createOrder);
router.post('/api/payments/verify', authenticateUser, authorizeUser(['client']), paymentController.verifyPayment);
router.get('/api/payments/history', authenticateUser, paymentController.history);

// ==================== MOUNT ROUTES ====================
app.use("/", router);

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Something went wrong!",
        message: err.message
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found", path: req.path });
});

// ==================== SERVER INITIALIZATION ====================
const server = http.createServer(app);
socket.init(server);

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;
