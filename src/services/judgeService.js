import { executeCode } from "./pistonService.js";

// Utility to normalize output for direct equality comparison
const normalizeText = (text) => {
    if (!text) return "";
    return text.toString().trim()
        .replace(/\r\n/g, '\n') // normalize newlines
        .replace(/[ \t]+$/gm, ''); // remove trailing whitespace per line
};

/**
 * Runs a single piece of code across an array of testcases
 */
export const judgeSubmission = async (code, language, testCases) => {
    const results = [];
    let passedCount = 0;
    let failedCount = 0;
    let maxExecutionTime = 0;
    
    let verdict = "Accepted"; // default to Accepted
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
            // execute the code
            const result = await executeCode(language, code, testCase.input);
            maxExecutionTime = Math.max(maxExecutionTime, result.executionTime || 0);
            
            // Check for Time limit
            if (result.executionTime > 2000) {
                verdict = "Time Limit Exceeded";
                failedCount++;
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.stdout || "",
                    status: "Time Limit Exceeded",
                    error: "Execution took more than 2 seconds."
                });
                break; // stop evaluating after TLE
            }

            // Check for execution/runtime errors
            if (!result.success && result.stderr) {
                verdict = "Runtime Error";
                failedCount++;
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.stdout || "",
                    status: "Runtime Error",
                    error: result.stderr
                });
                break; // Stop evaluating after Runtime Error
            }

            // Verify Outputs
            const normalizedActual = normalizeText(result.stdout);
            const normalizedExpected = normalizeText(testCase.expectedOutput);
            
            // The result mapping
            if (normalizedActual === normalizedExpected) {
                passedCount++;
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.stdout,
                    status: "Passed",
                    executionTime: result.executionTime
                });
            } else {
                verdict = "Wrong Answer";
                failedCount++;
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.stdout,
                    status: "Failed",
                    error: `Expected '${normalizedExpected}', but got '${normalizedActual}'`
                });
                break; // Stop evaluating after first failed testcase (LeetCode behavior)
            }
            
        } catch (error) {
            verdict = "Runtime Error";
            failedCount++;
            results.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: "",
                status: "Runtime Error",
                error: error.message
            });
            break;
        }
    }
    
    // Auto-fill untested cases as skipped
    if (results.length < testCases.length) {
         for(let i = results.length; i < testCases.length; i++) {
             results.push({
                 status: "Skipped",
                 input: testCases[i].input,
                 expectedOutput: testCases[i].expectedOutput
             });
         }
    }
    
    return {
        verdict,
        totalTestCases: testCases.length,
        passed: passedCount,
        failed: testCases.length - passedCount,
        maxExecutionTime,
        results
    };
};
