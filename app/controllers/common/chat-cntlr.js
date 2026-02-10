const Message = require("../../models/message-model");
const User = require("../../models/user-model");
const Booking = require("../../models/booking-model");
const socket = require("../../services/socket");

const chatController = {};

// --------------------------------------------------
// GET CHAT HISTORY (Based on Booking ID)
// --------------------------------------------------
chatController.getChatHistory = async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Verify booking exists and user is part of it
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json("Booking not found");

        if (booking.clientId.toString() !== req.userId &&
            booking.photographerId.toString() !== req.userId) {
            return res.status(403).json("Unauthorized access to this chat");
        }

        const messages = await Message.find({ bookingId }).sort({
            createdAt: 1,
        });

        // Mark incoming messages as read
        await Message.updateMany(
            { bookingId, receiverId: req.userId, read: false },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json("Failed to fetch chat history");
    }
};

// --------------------------------------------------
// SAVE & SEND MESSAGE
// --------------------------------------------------
chatController.saveChat = async (req, res) => {
    try {
        const { text, receiverId, bookingId } = req.body;
        const senderId = req.userId;

        const message = await Message.create({
            text,
            senderId,
            receiverId,
            bookingId,
            roomId: bookingId.toString(), // Room is simply the booking ID
        });

        const io = socket.getIO();
        io.to(bookingId.toString()).emit("newMessage", message);

        res.json({ success: true, message });
    } catch (err) {
        console.error(err);
        res.status(500).json("Message not sent");
    }
};

// --------------------------------------------------
// INBOX
// --------------------------------------------------
chatController.getInbox = async (req, res) => {
    try {
        const userId = req.userId;

        const messages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }],
        })
            .sort({ createdAt: -1 })
            .lean();

        const conversations = {};

        for (let msg of messages) {
            const bId = msg.bookingId.toString();
            if (!conversations[bId]) {
                const otherUserId =
                    msg.senderId.toString() === userId
                        ? msg.receiverId
                        : msg.senderId;

                const unreadCount = await Message.countDocuments({
                    bookingId: msg.bookingId,
                    receiverId: userId,
                    read: false,
                });

                const otherUser = await User.findById(otherUserId).select(
                    "name avatar role"
                );

                conversations[bId] = {
                    bookingId: bId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.createdAt,
                    unreadCount,
                    otherUser,
                };
            }
        }

        res.json(Object.values(conversations));
    } catch (err) {
        console.error(err);
        res.status(500).json("Inbox fetch failed");
    }
};

module.exports = chatController;
