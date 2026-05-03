import Notification from '../models/Notification.js';

export const notifyUser = async ({ userId, title, message, type = 'system', metadata = {} }) => {
  if (!userId || !title || !message) return null;

  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      metadata,
    });
    return notification;
  } catch (error) {
    // Notification failures should never block business operations.
    return null;
  }
};

export const notifyManyUsers = async ({ userIds = [], title, message, type = 'system', metadata = {} }) => {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean).map((id) => id.toString()))];
  if (!uniqueIds.length || !title || !message) return;

  const docs = uniqueIds.map((userId) => ({
    user: userId,
    title,
    message,
    type,
    metadata,
  }));

  try {
    await Notification.insertMany(docs, { ordered: false });
  } catch (_) {
    // Ignore notification fan-out errors.
  }
};
