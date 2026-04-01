export const MOCK_PROBLEMS = {
    "two-sum": {
        problemId: "two-sum",
        title: "1. Two Sum",
        difficulty: "Easy",
        examples: [
            { input: "nums = [2,7,11,15], target = 9", output: "[0,1]" },
            { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
            { input: "nums = [3,3], target = 6", output: "[0,1]" }
        ],
        testCases: [
            { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0,1]", isHidden: false },
            { input: "nums = [3,2,4], target = 6", expectedOutput: "[1,2]", isHidden: false },
            { input: "nums = [3,3], target = 6", expectedOutput: "[0,1]", isHidden: false },
            { input: "nums = [2,5,5,11], target = 10", expectedOutput: "[1,2]", isHidden: true }
        ]
    },
    "reverse-integer": {
        problemId: "reverse-integer",
        title: "2. Reverse Integer",
        difficulty: "Medium",
        examples: [
            { input: "x = 123", output: "321" },
            { input: "x = -123", output: "-321" },
            { input: "x = 120", output: "21" }
        ],
        testCases: [
            { input: "x = 123", expectedOutput: "321", isHidden: false },
            { input: "x = -123", expectedOutput: "-321", isHidden: false },
            { input: "x = 120", expectedOutput: "21", isHidden: false },
            { input: "x = 0", expectedOutput: "0", isHidden: true }
        ]
    }
};
