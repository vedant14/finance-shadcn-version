// If the access token is refereshed in once, then call it again
import axios from "axios";
import { getBody } from "~/utils/helperFunctions";
import prisma from "~/utils/prismaClient";

async function refreshAccessToken(userId, email) {
  console.log(`🔄 Fetching new access token for ${email}...`);
  try {
    const response = await axios.post(
      `${process.env.BASE_URL}/api/fetch-token`,
      {
        email,
      }
    );
    if (response.status !== 200 || !response.data.accessToken) {
      throw new Error("❌ Failed to refresh access token");
    }
    await prisma.user.update({
      where: { id: userId },
      data: { accessToken: response.data.accessToken },
    });

    return response.data.accessToken;
  } catch (error) {
    console.error("❌ Error refreshing token:", error);
    throw error;
  }
}

export const loader = async ({ params }) => {
  const days = 2;
  const sourceId = parseInt(params.sourceId, 10);
  if (isNaN(sourceId)) {
    return new Response(JSON.stringify({ error: "Invalid sourceId format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sourceObj = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { user: true },
  });

  if (!sourceObj || !sourceObj.user) {
    return new Response(JSON.stringify({ error: "Source or user not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - days);
  const afterDate = pastDate.toISOString().split("T")[0].replace(/-/g, "/");

  let queryParts = sourceObj.query ? [`${sourceObj.query}`] : [];
  queryParts.push(`after:${afterDate}`);
  const query = queryParts.join(" ");
  let accessToken = sourceObj.user.accessToken;
  try {
    const listResponse = await axios.get(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const messages = listResponse.data.messages || [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ message: `No emails found for query: ${query}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch existing email IDs to avoid duplicates
    const emailIds = messages.map((m) => m.id);
    const existingEmails = await prisma.ledger.findMany({
      where: { emailId: { in: emailIds } },
      select: { emailId: true },
    });
    const existingEmailIds = new Set(existingEmails.map((e) => e.emailId));

    // Process only new emails
    const newMessages = messages.filter((m) => !existingEmailIds.has(m.id));

    if (newMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: "All emails already processed." }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const emails = await Promise.all(
      newMessages.map(async (message) => {
        try {
          const messageResponse = await axios.get(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          const emailData = messageResponse.data;
          const headers = emailData.payload.headers || [];
          const subject =
            headers.find((header) => header.name === "Subject")?.value ||
            "No Subject";
          const emailDate =
            headers.find((header) => header.name === "Date")?.value || "";
          const receivedDate = new Date(emailDate);
          const body = getBody(emailData);

          // Upsert into database
          await prisma.ledger.upsert({
            where: { emailId: message.id },
            update: {
              date: receivedDate,
              userId: sourceObj.user.id,
              emailSubject: subject,
              body,
              categoryExtract: sourceObj.defaultCategory,
              transactionTypeExtract: sourceObj.defaultType,
              sourceId: sourceId,
            },
            create: {
              date: receivedDate,
              userId: sourceObj.user.id,
              emailSubject: subject,
              body,
              categoryExtract: sourceObj.defaultCategory,
              transactionTypeExtract: sourceObj.defaultType,
              emailId: message.id,
              sourceId: sourceId,
            },
          });

          return { id: message.id };
        } catch (emailError) {
          console.error(
            `❌ Error processing email ${message.id}:`,
            emailError.response?.data || emailError.message
          );
          return null;
        }
      })
    );

    return new Response(JSON.stringify(emails.filter(Boolean)), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`🔄 Token expired. Fetching new token...`);
      accessToken = await refreshAccessToken(
        sourceObj.user.id,
        sourceObj.user.email
      );
    } else {
      throw error;
    }
  }

  return new Response(JSON.stringify({ sourceObj }), {
    headers: { "Content-Type": "application/json" },
  });
};
