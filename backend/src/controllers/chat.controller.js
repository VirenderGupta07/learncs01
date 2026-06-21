const ChatRoom = require('../models/ChatRoom.model');
const Message = require('../models/Message.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/chat/messages?roomId=...&cursor=ISODate&limit=30
 *
 * Cursor-based pagination over the isolated Message collection (never an
 * array on User), scoped to rooms the requester actually participates in.
 */
exports.getMessages = catchAsync(async (req, res, next) => {
  const { roomId, cursor, limit = 30 } = req.query;

  if (!roomId) {
    return next(new ApiError('roomId query parameter is required', 400));
  }

  const room = await ChatRoom.findById(roomId);
  if (!room) {
    return next(new ApiError('Chat room not found', 404));
  }

  const isParticipant = room.participants.some((p) => p.toString() === req.user._id.toString());
  const isModeratorAdmin = req.user.role === 'admin' && req.user.permissions?.moderateChat;

  if (!isParticipant && !isModeratorAdmin && !req.user.isSuperAdmin) {
    return next(new ApiError('You do not have access to this conversation', 403));
  }

  const query = { chatRoom: roomId };
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 100))
    .populate('sender', 'name avatar role')
    .lean();

  if (isParticipant) {
    await Message.updateMany(
      { chatRoom: roomId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
  }

  const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt : null;

  return res.status(200).json({
    status: 'success',
    data: {
      messages: messages.reverse(),
      nextCursor,
    },
  });
});

/** Finds an existing 1:1 room (e.g. student <-> instructor for a course) or creates one. */
exports.findOrCreateRoom = catchAsync(async (req, res, next) => {
  const { participantId, courseId } = req.body;

  if (!participantId) {
    return next(new ApiError('participantId is required', 400));
  }

  let room = await ChatRoom.findOne({
    participants: { $all: [req.user._id, participantId], $size: 2 },
    ...(courseId ? { course: courseId } : {}),
  });

  if (!room) {
    room = await ChatRoom.create({
      participants: [req.user._id, participantId],
      course: courseId || undefined,
    });
  }

  return res.status(200).json({ status: 'success', data: { room } });
});

/** Lists all rooms the current user participates in, for a chat inbox view. */
exports.getMyRooms = catchAsync(async (req, res) => {
  const rooms = await ChatRoom.find({ participants: req.user._id })
    .populate('participants', 'name avatar role')
    .populate('course', 'title slug')
    .sort('-lastMessageAt');

  res.status(200).json({ status: 'success', data: { rooms } });
});
