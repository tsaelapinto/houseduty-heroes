import cron from 'node-cron';
import prisma from '../db/client';
// import webpush from 'web-push'; // To be configured later

export function initReminders() {
  // Run every 15 minutes to check for pending reminders
  // For production, we can use 0 * * * * for hourly, but 15m is safer for precise-ish HH:MM
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    console.log(`[reminders] Checking for reminders at ${currentTime}...`);

    try {
      // Find kids who have a reminder set for NOW 
      // (rounding to nearest 15m check)
      const usersToRemind = await prisma.user.findMany({
        where: {
          OR: [
            { morningReminderTime: currentTime },
            { eveningReminderTime: currentTime }
          ]
        },
        include: {
            household: true
        }
      });

      for (const user of usersToRemind) {
        console.log(`[reminders] Sending reminder to ${user.name} (${user.role})`);
        // Actual push notification logic will go here
        // sendPushNotification(user, "Don't forget your duties today! 🏠🦸");
      }
    } catch (err) {
      console.error('[reminders] Error processing reminders:', err);
    }
  });
}
