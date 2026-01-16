import { StreamChat } from "stream-chat";
import { StreamClient } from "@stream-io/node-sdk";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("STREAM_API_KEY or STREAM_API_SECRET is missing");
}

export const chatClient = (apiKey && apiSecret) ? StreamChat.getInstance(apiKey, apiSecret) : null; // will be used chat features
export const streamClient = (apiKey && apiSecret) ? new StreamClient(apiKey, apiSecret) : null; // will be used for video calls

export const upsertStreamUser = async (userData) => {
  const cleanUser = { ...userData };
  // Stream requires image to be a valid URL or undefined, empty string fails validation
  if (!cleanUser.image) {
    delete cleanUser.image;
  }

  if (!chatClient || !streamClient) return;

  try {
    // Upsert to Chat Client
    await chatClient.upsertUser(cleanUser);
    console.log("Stream Chat user upserted successfully:", cleanUser.id);
  } catch (error) {
    console.error("Error upserting Stream Chat user:", error);
  }

  try {
    // Upsert to Video Client
    // Note: Video SDK expects an array for upsertUsers and strict role definitions sometimes.
    // We map id to id, name to name, image to image.
    const videoUser = {
      id: cleanUser.id,
      name: cleanUser.name,
      image: cleanUser.image, // might be undefined, which is fine
      // role: 'user' // Default is usually 'user'
    };

    await streamClient.upsertUsers([videoUser]);
    console.log("Stream Video user upserted successfully:", cleanUser.id);
  } catch (error) {
    console.error("Error upserting Stream Video user:", error);
  }
};

export const deleteStreamUser = async (userId) => {
  try {
    await chatClient.deleteUser(userId);
    console.log("Stream user deleted successfully:", userId);
  } catch (error) {
    console.error("Error deleting the Stream user:", error);
  }
};