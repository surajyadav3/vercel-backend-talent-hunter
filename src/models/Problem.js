import mongoose from "mongoose";

const TestCaseSchema = new mongoose.Schema({
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false }
});

const ExampleSchema = new mongoose.Schema({
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String }
});

const ProblemSchema = new mongoose.Schema({
    problemId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    category: { type: String },
    description: {
        text: { type: String, required: true },
        notes: [{ type: String }]
    },
    constraints: [{ type: String }],
    examples: [ExampleSchema],
    testCases: [TestCaseSchema],
    starterCode: {
        javascript: { type: String, default: "" },
        python: { type: String, default: "" },
        java: { type: String, default: "" },
        cpp: { type: String, default: "" }
    },
    isPremium: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Problem || mongoose.model("Problem", ProblemSchema);
