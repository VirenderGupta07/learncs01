const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 4000 },
    attachments: [{ url: String, type: String }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Supports cursor-based pagination ordered newest-first per room.
messageSchema.index({ chatRoom: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
