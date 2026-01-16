import { startSession } from "mongoose"
import { chatClient, streamClient, upsertStreamUser } from "../lib/stream.js"
import Session from "../models/Session.js"
import User from "../models/User.js"

export async function createSession(req, res) {
     try {
          const { problem, difficulty } = req.body
          const userId = req.user._id
          const clerkId = req.user.clerkId

          if (!problem || !difficulty) {
               return res.status(400).json({ message: "Problem and difficulty  are required" })
          }

          //generate a unique call id for stream video
          const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

          // Ensure user exists in Stream before creating call
          await upsertStreamUser({
               id: clerkId,
               name: req.user.name,
               image: req.user.profileImage,
          });

          //create session in db 
          const session = await Session.create({ problem, difficulty, host: userId, callId });

          //create a stream video call 
          try {
               await streamClient.video.call("default", callId).getOrCreate({
                    data: {
                         created_by_id: clerkId,
                         custom: { problem, difficulty, sessionId: session._id.toString() }
                    },
               });
          } catch (videoError) {
               console.error("Error creating Stream video call:", videoError);
               await Session.findByIdAndDelete(session._id);
               return res.status(500).json({ message: "Failed to initiate video call: " + videoError.message });
          }

          //chat messaging 
          try {
               const channel = chatClient.channel("messaging", callId, {
                    name: `${problem} Session`,
                    created_by_id: clerkId,
                    members: [clerkId]
               })

               await channel.create()
          } catch (chatError) {
               console.error("Error creating Stream chat channel:", chatError);
               await Session.findByIdAndDelete(session._id);
               // attempt to clean up the video call we just created
               try { await streamClient.video.call("default", callId).delete(); } catch (e) { }
               return res.status(500).json({ message: "Failed to initiate chat channel: " + chatError.message });
          }

          await session.populate("host", "name profileImage email clerkId");

          res.status(201).json({ success: true, session });

     } catch (error) {
          console.log("Error in createSession controller:", error.message);
          res.status(500).json({ message: error.message || "Internal Server Error" });

     }
}

export async function getActiveSessions(_, res) {
     try {
          const sessions = await Session.find({ status: "active" })
               .populate("host", "name profileImage email clerkId")
               .sort({ createdAt: -1 })
               .limit(20);


          res.status(200).json({ sessions })
     } catch (error) {
          console.log("Error in getActiveSessions controller:", error.message);
          res.status(500).json({ message: "Internal Server Error" });
     }
}

export async function getMyRecentSessions(req, res) {
     try {
          const userId = req.user._id
          //get those sessions where user is either host or participant 
          const sessions = await Session.find({
               status: "completed",
               $or: [{ host: userId }, { participant: userId }],
          })
               .sort({ createdAt: -1 })
               .limit(20);

          res.status(200).json({ sessions })

     } catch (error) {
          console.log("Error in getMyRecentSessions controllers:", error.message);
          res.status(500).json({ message: "Internal Server Error" });

     }
}

export async function getSessionById(req, res) {
     try {
          const { id } = req.params

          const session = await Session.findById(id)
               .populate("host", "name email profileImage clerkId")
               .populate("participant", "name email profileImage clerkId")

          if (!session) return res.status(404).json({ message: "Session not found" })

          res.status(200).json({ session })
     } catch (error) {
          console.log("Error in getSessionById controller:", error.message);
          res.status(500).json({ message: "Internal Server Error" })
     }
}

export async function joinSession(req, res) {
     try {
          const { id } = req.params
          const userId = req.user._id
          const clerkId = req.user.clerkId

          const session = await Session.findById(id);
          if (!session) return res.status(404).json({ message: "Session not found" });
          if (session.status !== "active") {
               return res.status(400).json({ message: "Cannot join a completed session" })
          }

          if (session.host.toString() === userId.toString()) {
               return res.status(400).json({ message: "Host cannot join their own session as participant" })
          }
          //check if the sesssion is already full or not 
          if (session.participant) return res.status(409).json({ message: "Session is full" })


          session.participant = userId
          await session.save();

          const channel = chatClient.channel("messaging", session.callId)
          await channel.addMembers([clerkId])

          res.status(200).json({ session })

     } catch (error) {
          console.log("Error in joinSession controller:", error.message);
          res.status(500).json({ message: "Internal Server Error" })
     }
}

export async function endSession(req, res) {
     try {
          const { id } = req.params
          const userId = req.user._id

          const session = await Session.findById(id)
          if (!session) return res.status(404).json({ message: "Session not found" });

          //check if user is host 

          if (session.host.toString() !== userId.toString()) {
               return res.status(403).json({ message: "Only the host can end this session" })
          }
          //check if session is already completed
          if (session.status == "completed") {
               return res.status(400).json({ message: "Session is already completed " })
          }

          //delete vc 

          const call = streamClient.video.call("default", session.callId)
          await call.delete({ hard: true })

          //delete chat 
          const channel = chatClient.channel("messaging", session.callId)
          await channel.delete();

          // Increment problemsSolved for host and participant
          if (session.host) {
               await User.findByIdAndUpdate(session.host, { $inc: { problemsSolved: 1 } });
          }
          if (session.participant) {
               await User.findByIdAndUpdate(session.participant, { $inc: { problemsSolved: 1 } });
          }

          session.status = "completed"
          await session.save()

          res.status(200).json({ session, message: "Session ended successfully" })
     } catch (error) {
          console.log("Error in endSession controller:", error.message);
          res.status(500).json({ message: "Internal Server Error" })
     }
}
