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
     }
},
     { timestamps: true } //created at;
);


const User = mongoose.model("User", userSchema)

export default User;