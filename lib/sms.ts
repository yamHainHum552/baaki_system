type SmsProvider = "sparrow" | "twilio";

export async function sendSMS(phone: string, message: string) {
  const preferred = (process.env.SMS_PROVIDER ?? "sparrow").toLowerCase() as SmsProvider;

  try {
    if (preferred === "twilio") {
      return await sendViaTwilio(phone, message);
    }

    return await sendViaSparrow(phone, message);
  } catch (error) {
    if (preferred !== "twilio") {
      return await sendViaTwilio(phone, message);
    }
    throw error;
  }
}

export type ReminderTemplate = "polite" | "due_today" | "final";

export function buildReminderMessage(amount: number, customerName?: string | null, template: ReminderTemplate = "polite") {
  const roundedAmount = Math.round(amount);
  const name = customerName?.trim() ? `${customerName.trim()} ji, ` : "";

  if (template === "due_today") {
    return `${name}tapai ko Rs. ${roundedAmount} baaki cha. Aaja milayera tiridinu hola.`;
  }

  if (template === "final") {
    return `${name}Rs. ${roundedAmount} baaki ajhai baki cha. Kripaya chadai bhuktani garnu hola.`;
  }

  return `${name}tapai ko Rs. ${roundedAmount} baaki cha. Kripaya tirnus.`;
}

async function sendViaSparrow(phone: string, message: string) {
  const token = process.env.SPARROW_SMS_TOKEN;
  const from = process.env.SPARROW_SMS_FROM ?? "Baaki";

  if (!token) {
    throw new Error("Sparrow SMS is not configured.");
  }

  const response = await fetch("https://api.sparrowsms.com/v2/sms/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: phone,
      text: message
    })
  });

  if (!response.ok) {
    throw new Error("Sparrow SMS request failed.");
  }

  return { provider: "sparrow" as const };
}

async function sendViaTwilio(phone: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !authToken || !from) {
    throw new Error("Twilio is not configured.");
  }

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: message
  });

  const authHeader = Buffer.from(`${sid}:${authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error("Twilio request failed.");
  }

  return { provider: "twilio" as const };
}
