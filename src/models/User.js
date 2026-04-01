import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
     name: {
          type: String,
          required: true,
     },
     email: {
          type: String,
          required: true,
          unique: true,
     },
     profileImage: {
          type: String,
          default: ""
     },
     mobileNo: {
          type: String,
     },
     problemsSolved: {
          type: Number,
          default: 0
     },
     clerkId: {
          type: String,
          required: true,
          unique: true,
     },
     isPremium: {
          type: Boolean,
          default: false
     },
     subscriptionTier: {
          type: String,
          enum: ["free", "pro", "elite"],
          default: "free"
     },
     role: {
          type: String,
          enum: ["user", "admin", "recruiter", "candidate"], 
          default: "user"
     },
     roleSelected: {
          type: Boolean,
          default: false
     },
     password: {
          type: String, // fallback for universal admin login
     }
},
     { timestamps: true } //created at;
);

// Performance indexes
userSchema.index({ problemsSolved: -1 }); // Leaderboard sorting
userSchema.index({ clerkId: 1 }, { unique: true }); // Fast lookups by clerkId (already unique, this makes it explicit)


const User = mongoose.model("User", userSchema)

export default User;