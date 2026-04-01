import { chatClient, streamClient, upsertStreamUser } from "../lib/stream.js"
import Session from "../models/Session.js"
import User from "../models/User.js"
import { sendInviteEmail } from "../lib/email.js"

export async function createSession(req, res) {
     try {
          const { problem, difficulty } = req.body
          const userId = req.user._id
          const clerkId = req.user.clerkId
          const userRole = req.user.role

          if (userRole !== "admin" && userRole !== "recruiter") {
               return res.status(403).json({ message: "Only an admin or recruiter can create an interview session" })
          }

          if (!problem || !difficulty) {
               return res.status(400).json({ message: "Problem and difficulty  are required" })
          }

          // Check if there is already an active session for the same problem created by this host
          const existingSession = await Session.findOne({
               problem,
               host: userId,
               status: "active"
          }).populate("host", "name profileImage email clerkId").lean();

          if (existingSession) {
               return res.status(200).json({
                    success: true,
                    session: existingSession,
                    message: "An active room for this question already exists. Joining that room."
               });
          }

          //generate a unique call id for stream video
          const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

          // Ensure user exists in Stream & create session in DB in parallel
          const [, session] = await Promise.all([
               upsertStreamUser({
                    id: clerkId,
                    name: req.user.name,
                    image: req.user.profileImage,
               }),
               Session.create({ problem, difficulty, host: userId, callId })
          ]);

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

          // If inviteEmail is provided, send the invite automatically
          if (req.body.inviteEmail) {
             const sessionLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/session/${session._id}`;
             await sendInviteEmail(req.body.inviteEmail, sessionLink, problem, req.user.name);
          }

          res.status(201).json({ success: true, session });

     } catch (error) {
          console.log("Error in createSession controller:", error.message);
          res.status(500).json({ message: error.message || "Internal Server Error" });

     }
}

export async function getActiveSessions(req, res) {
     try {
          const userId = req.user._id;
          const userRole = req.user.role;
          
          let query = { status: "active" };
          
          // ROLE-STRICT VISIBILITY: 
          // Recruiters see what they HOST.
          // Candidates see where they are the PARTICIPANT.
          if (userRole === "recruiter") {
               query.host = userId;
          } else if (userRole === "candidate") {
               query.participant = userId;
          } else if (userRole !== "admin") {
               // Fallback: only items where user is involved
               query.$or = [{ host: userId }, { participant: userId }];
          }

          const sessions = await Session.find(query)
               .populate("host", "name profileImage email clerkId")
               .sort({ createdAt: -1 })
               .limit(20)
               .lean();

          // Force headers to prevent any browser/CDN caching of session lists
          res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
          res.status(200).json({ sessions });
     } catch (error) {
          console.error("Error in getActiveSessions:", error);
          res.status(500).json({ message: "Internal Server Error" });
     }
}

export async function getMyRecentSessions(req, res) {
     try {
          const userId = req.user._id
          const userRole = req.user.role;

          let query = { status: "completed" };
          
          // Show only relevant history for non-admins
          if (userRole !== "admin") {
               query.$or = [{ host: userId }, { participant: userId }];
          }

          const sessions = await Session.find(query)
               .populate("host", "name profileImage email clerkId")
               .populate("participant", "name profileImage email clerkId")
               .sort({ updatedAt: -1 })
               .limit(20)
               .lean(); 

          res.status(200).json({ sessions })
     } catch (error) {
          console.error("Error in getMyRecentSessions:", error);
          res.status(500).json({ message: "Internal Server Error" });
     }
}

export async function getSessionById(req, res) {
     try {
          const { id } = req.params

          const session = await Session.findById(id)
               .populate("host", "name email profileImage clerkId")
               .populate("participant", "name email profileImage clerkId")
               .lean(); // lean() for read-only data

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

          // Run all cleanup operations in parallel for speed
          const cleanupPromises = [
               streamClient.video.call("default", session.callId).delete({ hard: true }),
               chatClient.channel("messaging", session.callId).delete(),
          ];

          // Increment problemsSolved in parallel too
          if (session.host) {
               cleanupPromises.push(
                    User.findByIdAndUpdate(session.host, { $inc: { problemsSolved: 1 } })
               );
          }
          if (session.participant) {
               cleanupPromises.push(
                    User.findByIdAndUpdate(session.participant, { $inc: { problemsSolved: 1 } })
               );
          }

          // Execute all in parallel
          await Promise.allSettled(cleanupPromises);

          session.status = "completed"
          await session.save()

          res.status(200).json({ session, message: "Session ended successfully" })
     } catch (error) {
          console.log("Error in endSession controller:", error.message);
          res.status(500).json({ message: "Internal Server Error" })
     }
}


export async function inviteStudent(req, res) {
     try {
          const { id } = req.params; // session ID
          const { studentEmail, studentClerkId } = req.body;
          const hostId = req.user._id;

          if (!studentEmail && !studentClerkId) {
               return res.status(400).json({ message: "Student email or Clerk ID is required" });
          }

          const session = await Session.findById(id).populate("host", "name");
          if (!session) return res.status(404).json({ message: "Session not found" });

          // check if current user is the host
          if (session.host._id.toString() !== hostId.toString()) {
               return res.status(403).json({ message: "Only the host can invite students" });
          }

          // find the student in the database (optional for email invites, required for Clerk ID)
          let student;
          let targetEmail = studentEmail;

          if (studentClerkId) {
               student = await User.findOne({ clerkId: studentClerkId });
               if (!student) {
                    return res.status(404).json({ message: "Student with this Clerk ID not found." });
               }
               targetEmail = student.email;
          }

          if (!targetEmail) {
               return res.status(400).json({ message: "A valid email address is required for invitation." });
          }

          const sessionLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/session/${id}`;
          const isEmailSent = await sendInviteEmail(targetEmail, sessionLink, session.problem, session.host.name);

          if (!isEmailSent) {
               return res.status(500).json({ message: "Failed to send invitation email." });
          }

          res.status(200).json({ message: `Invitation successfully sent to ${studentEmail}` });
     } catch (error) {
          console.log("Error in inviteStudent controller:", error.message);
          res.status(500).json({ message: "Internal Server Error" });
     }
}
