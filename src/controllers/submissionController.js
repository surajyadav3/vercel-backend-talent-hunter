import Problem from "../models/Problem.js";
import { executeCode } from "../services/pistonService.js";
import { judgeSubmission } from "../services/judgeService.js";
import { MOCK_PROBLEMS } from "../data/mockProblems.js";

// Endpoint: POST /submit
export const submitCode = async (req, res) => {
    try {
        const { code, language, problemId } = req.body;

        if (!code || !language || !problemId) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        let problem = await Problem.findOne({ problemId });
        
        if (!problem && MOCK_PROBLEMS[problemId]) {
             problem = MOCK_PROBLEMS[problemId];
        }

        if (!problem) {
            return res.status(404).json({ message: "Problem not found." });
        }

        // Combine examples and testCases for full judgment (LeetCode runs all)
        const allTestCases = [
            ...problem.examples.map(ex => ({ input: ex.input, expectedOutput: ex.output, isHidden: false })),
            ...(problem.testCases || [])
        ];

        if (allTestCases.length === 0) {
            return res.status(400).json({ message: "No test cases found for this problem." });
        }

        const judgeResult = await judgeSubmission(code, language, allTestCases);

        // Strip hidden outputs from response if they failed (LeetCode premium reveals them, but standard might not, let's just return the result array for MVP)
        res.status(200).json(judgeResult);
    } catch (error) {
        console.error("Submit Error:", error);
        res.status(500).json({ message: "Internal server error during submission." });
    }
};

// Endpoint: POST /run
export const runCode = async (req, res) => {
    try {
        const { code, language, problemId, testCases } = req.body;
        // if testCases is provided, run those. Else look up problem examples.

        let casesToRun = testCases;

        if (!casesToRun && problemId) {
            let problem = await Problem.findOne({ problemId });
            
            if (!problem && MOCK_PROBLEMS[problemId]) {
                 problem = MOCK_PROBLEMS[problemId];
            }
            
            if (!problem) return res.status(404).json({ message: "Problem not found." });
            casesToRun = problem.examples.map(ex => ({ input: ex.input || ex.input, expectedOutput: ex.output || ex.expectedOutput }));
        }

        if (!casesToRun || casesToRun.length === 0) {
             return res.status(400).json({ message: "No testcases provided." });
        }

        const judgeResult = await judgeSubmission(code, language, casesToRun);
        res.status(200).json(judgeResult);
    } catch (error) {
        console.error("Run Error:", error);
        res.status(500).json({ message: "Internal server error during execution." });
    }
};
