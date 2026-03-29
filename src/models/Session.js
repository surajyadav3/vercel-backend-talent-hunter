import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
     {
          problem: {
               type: String,
               required: true,
          },
          difficulty: {
               type: String,
               enum: ["easy", "medium", "hard"],
               required: true,
          },
          host: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "User",
               required: true,
          },
          participant: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "User",
               default: null,
          },
          status: {
               type: String,
               enum: ["active", "completed"],
               default: "active",
          },
          // stream video call ID
          callId: {
               type: String,
               default: "",
          },
     },
     { timestamps: true }
);

// Performance indexes for frequent queries
sessionSchema.index({ status: 1, createdAt: -1 }); // getActiveSessions: find active, sort by date
sessionSchema.index({ status: 1, host: 1, createdAt: -1 }); // getMyRecentSessions by host
sessionSchema.index({ status: 1, participant: 1, createdAt: -1 }); // getMyRecentSessions by participant
sessionSchema.index({ problem: 1, host: 1, status: 1 }); // createSession duplicate check

const Session = mongoose.model("Session", sessionSchema);

export default Session;