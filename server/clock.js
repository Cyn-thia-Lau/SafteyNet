require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const cron = require("node-cron");
const twilio = require("twilio");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendAlert(checkin) {
  // Get this user's emergency contacts
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", checkin.user_id);
    console.log("  Contacts found:", JSON.stringify(contacts));

  if (!contacts || contacts.length === 0) {
    console.log("  No contacts found for user — skipping SMS.");
    return;
    
  }

  const mapsLink = `https://maps.google.com/?q=${checkin.last_lat},${checkin.last_lng}`;
  const message = `🚨 SAFETY ALERT: Your contact hasn't checked in and their deadline has passed. Last known location: ${mapsLink} — Please try to reach them immediately.`;

  for (const contact of contacts) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE,
        to: contact.phone,
      });
      console.log(`  ✅ Alert sent to ${contact.name} (${contact.phone})`);
    } catch (err) {
      console.error(`  ❌ Failed to text ${contact.name}:`, err.message);
    }
  }
}

async function checkDeadlines() {
  const now = new Date().toISOString();
  console.log(`[${new Date().toLocaleTimeString()}] Checking for expired check-ins…`);

  const { data: expired, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("status", "active")
    .lt("deadline", now);

  if (error) {
    console.error("Error reading check-ins:", error.message);
    return;
  }

  if (!expired || expired.length === 0) {
    console.log("  All clear — no expired check-ins.");
    return;
  }

  for (const checkin of expired) {
    console.log("  ⚠️  MISSED CHECK-IN — sending alert!");
    console.log("     User:", checkin.user_id);
    console.log("     Location:", checkin.last_lat, checkin.last_lng);

    await sendAlert(checkin);

    // Mark triggered so we don't alert repeatedly
    await supabase
      .from("checkins")
      .update({ status: "triggered" })
      .eq("id", checkin.id);
  }
}

cron.schedule("* * * * *", checkDeadlines);
console.log("🟢 Safety Net clock is running. Checking every minute.");
console.log("   Press Ctrl+C to stop.");
checkDeadlines();