'use strict';

const cron = require('node-cron');
const webpush = require('web-push');
const User = require('../models/User');
const Habit = require('../models/Habit');
const logger = require('./logger');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const sendPush = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — clean up
      await User.updateOne(
        { 'pushSubscription.endpoint': subscription.endpoint },
        { $unset: { pushSubscription: 1 } }
      );
    }
  }
};

exports.scheduleNotifications = () => {
  // ── Daily habit reminder at 8:00 AM ──────────────────────────
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running habit reminder cron');
    try {
      const users = await User.find({
        pushSubscription: { $exists: true },
        'notifications.habitReminders': true,
      });

      for (const user of users) {
        const today = new Date().toISOString().split('T')[0];
        const habits = await Habit.find({ user: user._id, isArchived: false });
        const pending = habits.filter(h => !h.completions.some(c => c.date === today));

        if (pending.length > 0) {
          await sendPush(user.pushSubscription, {
            title: 'THINGS — Habit Reminder',
            body: `You have ${pending.length} habit${pending.length > 1 ? 's' : ''} pending today. Stay on track! 🎯`,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: 'habit-reminder',
            data: { url: '/habits' },
          });
        }
      }
    } catch (err) {
      logger.error('Habit reminder cron error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── Evening check-in at 9:00 PM ──────────────────────────────
  cron.schedule('0 21 * * *', async () => {
    logger.info('Running mood check-in cron');
    try {
      const { Mood } = require('../models');
      const today = new Date().toISOString().split('T')[0];
      const usersWithMood = await Mood.distinct('user', { date: today });

      const users = await User.find({
        pushSubscription: { $exists: true },
        'notifications.focusAlerts': true,
        _id: { $nin: usersWithMood },
      });

      for (const user of users) {
        await sendPush(user.pushSubscription, {
          title: 'THINGS — Evening Check-in',
          body: `How was your day, ${user.name.split(' ')[0]}? Log your mood and reflect. 🌙`,
          icon: '/icon-192.png',
          tag: 'mood-checkin',
          data: { url: '/mood' },
        });
      }
    } catch (err) {
      logger.error('Mood check-in cron error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── Weekly report every Sunday at 8:00 PM ─────────────────────
  cron.schedule('0 20 * * 0', async () => {
    logger.info('Running weekly report cron');
    try {
      const users = await User.find({
        pushSubscription: { $exists: true },
        'notifications.weeklyReport': true,
      });
      for (const user of users) {
        await sendPush(user.pushSubscription, {
          title: 'THINGS — Weekly Report Ready',
          body: '📊 Your week in review is ready. See how you did!',
          icon: '/icon-192.png',
          tag: 'weekly-report',
          data: { url: '/analytics' },
        });
      }
    } catch (err) {
      logger.error('Weekly report cron error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });
};
