const cloudinary = require('../../config/cloudinary');
const User = require('../../models/user-model');

const uploadController = {
    async avatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const user = await User.findByIdAndUpdate(
                req.userId,
                { 'profile.avatar': req.file.path },
                { new: true }
            ).select('-passwordHash');

            res.json({ message: 'Avatar uploaded successfully', avatar: req.file.path, user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async portfolio(req, res) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const imagePaths = req.files.map(file => file.path);

            const user = await User.findByIdAndUpdate(
                req.userId,
                { $push: { 'profile.portfolio': { $each: imagePaths } } },
                { new: true }
            ).select('-passwordHash');

            res.json({ message: 'Portfolio images uploaded successfully', images: imagePaths, user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deletePortfolioImage(req, res) {
        try {
            const { publicId } = req.params;

            // Delete from Cloudinary
            await cloudinary.uploader.destroy(publicId);

            // Remove from user's portfolio
            const user = await User.findByIdAndUpdate(
                req.userId,
                { $pull: { 'profile.portfolio': { $regex: publicId } } },
                { new: true }
            ).select('-passwordHash');

            res.json({ message: 'Portfolio image deleted successfully', user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = uploadController;
