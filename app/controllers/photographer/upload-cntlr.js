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
                { avatar: req.file.path }, // Updated to match User model (avatar field at root)
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

            // multer-storage-cloudinary provides 'path' as URL and 'filename' as public_id
            const portfolioItems = req.files.map(file => ({
                url: file.path,
                public_id: file.filename
            }));

            const user = await User.findByIdAndUpdate(
                req.userId,
                { $push: { portfolio: { $each: portfolioItems } } }, // Updated to match User model (portfolio field at root)
                { new: true }
            ).select('-passwordHash');

            res.json({ message: 'Portfolio images uploaded successfully', images: portfolioItems, user, portfolio: user.portfolio });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async deletePortfolioImage(req, res) {
        try {
            let { publicId } = req.params;
            if (Array.isArray(publicId)) {
                publicId = publicId.join('/');
            }

            // Delete from Cloudinary
            await cloudinary.uploader.destroy(publicId);

            // Remove from user's portfolio in MongoDB
            const user = await User.findByIdAndUpdate(
                req.userId,
                { $pull: { portfolio: { public_id: publicId } } },
                { new: true }
            ).select('-passwordHash');

            res.json({ message: 'Portfolio image deleted successfully', user, portfolio: user.portfolio });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = uploadController;
