const ChatRoom = require('../models/ChatRoom.model');
const Message = require('../models/Message.model');
const logger = require('../config/logger');

module.exports = function registerChatHandlers(io, socket) {
  socket.on('chat:join', async (roomId) => {
    const room = await ChatRoom.findById(roomId);
    if (!room || !room.participants.some((p) => p.toString() === socket.user._id.toString())) {
      return socket.emit('chat:error', { message: 'Not authorized for this room' });
    }
    socket.join(`room:${roomId}`);
  });

  socket.on('chat:sendMessage', async ({ roomId, content, attachments = [] }) => {
    try {
      if (!content || !content.trim()) return;

      const room = await ChatRoom.findById(roomId);
      if (!room || !room.participants.some((p) => p.toString() === socket.user._id.toString())) {
        return socket.emit('chat:error', { message: 'Not authorized for this room' });
      }

      const message = await Message.create({
        chatRoom: roomId,
        sender: socket.user._id,
        content: content.trim().slice(0, 4000),
        attachments,
        readBy: [socket.user._id],
      });

      room.lastMessage = message.content.slice(0, 120);
      room.lastMessageAt = new Date();
      await room.save();

      const populated = await message.populate('sender', 'name avatar role');

      io.to(`room:${roomId}`).emit('chat:newMessage', populated);

      const recipientId = room.participants.find((p) => p.toString() !== socket.user._id.toString());
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('notification:new', {
          type: 'chat_message',
          roomId,
          preview: room.lastMessage,
        });
      }
    } catch (err) {
      logger.error(`chat:sendMessage failed: ${err.message}`);
      socket.emit('chat:error', { message: 'Could not send message' });
    }
  });

  socket.on('chat:typing', ({ roomId, isTyping }) => {
    socket.to(`room:${roomId}`).emit('chat:typing', { userId: socket.user._id, isTyping });
  });
};
