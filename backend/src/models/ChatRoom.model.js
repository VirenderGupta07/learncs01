const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (v) => v.length === 2,
        message: 'A chat room must have exactly two participants (student + instructor)',
      },
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // optional context
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatRoomSchema.index({ participants: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
