import * as https from 'https';
import * as jwt from 'jsonwebtoken';
import { storage } from '../storage';
import type { SessionReminder } from './sessionChecker';

interface APNsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
}

interface APNsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    sound: string;
    badge?: number;
  };
  sessionId?: string;
  reminderNumber?: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getConfig(): APNsConfig | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  
  if (!keyId || !teamId || !bundleId || !privateKey) {
    console.warn('[APNs] Missing configuration. Required: APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_PRIVATE_KEY');
    return null;
  }
  
  const production = process.env.NODE_ENV === 'production';
  
  return { keyId, teamId, bundleId, privateKey, production };
}

function generateAuthToken(config: APNsConfig): string {
  const now = Math.floor(Date.now() / 1000);
  
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }
  
  const payload = {
    iss: config.teamId,
    iat: now,
  };
  
  const formattedKey = config.privateKey.replace(/\\n/g, '\n');
  
  const token = jwt.sign(payload, formattedKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: config.keyId,
    },
  });
  
  cachedToken = {
    token,
    expiresAt: now + 3500,
  };
  
  return token;
}

async function sendPushNotification(
  deviceToken: string,
  payload: APNsPayload,
  config: APNsConfig
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  return new Promise((resolve) => {
    const host = config.production
      ? 'api.push.apple.com'
      : 'api.sandbox.push.apple.com';
    
    const authToken = generateAuthToken(config);
    
    const options: https.RequestOptions = {
      hostname: host,
      port: 443,
      path: `/3/device/${deviceToken}`,
      method: 'POST',
      headers: {
        'authorization': `bearer ${authToken}`,
        'apns-topic': config.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, statusCode: 200 });
        } else {
          let errorReason = 'Unknown error';
          try {
            const parsed = JSON.parse(body);
            errorReason = parsed.reason || errorReason;
          } catch (e) {}
          resolve({ success: false, error: errorReason, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

export async function sendReminder(reminder: SessionReminder): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    console.log('[APNs] Skipping notification - APNs not configured');
    return false;
  }
  
  const deviceTokens = await storage.getDeviceTokensByCoach(reminder.coachId);
  
  if (deviceTokens.length === 0) {
    console.log(`[APNs] No device tokens for coach ${reminder.coachName}`);
    return false;
  }
  
  const payload: APNsPayload = {
    aps: {
      alert: {
        title: 'Session Reminder',
        body: reminder.message,
      },
      sound: 'default',
    },
    sessionId: reminder.session.id,
    reminderNumber: reminder.reminderNumber,
  };
  
  let anySuccess = false;
  
  for (const deviceToken of deviceTokens) {
    const result = await sendPushNotification(deviceToken.deviceToken, payload, config);
    
    if (result.success) {
      console.log(`[APNs] ✅ Sent to ${reminder.coachName}: "${reminder.message}"`);
      anySuccess = true;
    } else {
      console.log(`[APNs] ❌ Failed for ${reminder.coachName}: ${result.error}`);
      
      if (result.statusCode === 410 || result.error === 'Unregistered' || result.error === 'BadDeviceToken') {
        await storage.deactivateDeviceToken(deviceToken.deviceToken);
        console.log(`[APNs] Deactivated invalid token`);
      }
    }
  }
  
  if (anySuccess) {
    await storage.createNotificationLog({
      sessionId: reminder.session.id,
      coachId: reminder.coachId,
      reminderNumber: reminder.reminderNumber,
      notificationType: reminder.missingItems.length === 2 ? 'both_reminder' : `${reminder.missingItems[0]}_reminder`,
      status: 'sent',
      messageContent: reminder.message,
    });
  }
  
  return anySuccess;
}

export async function sendAllReminders(reminders: SessionReminder[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  
  for (const reminder of reminders) {
    const success = await sendReminder(reminder);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }
  
  return { sent, failed };
}

export function isConfigured(): boolean {
  return getConfig() !== null;
}
