import axios from "axios";

const PISTON_API = "https://emkc.org/api/v2/piston";

const LANGUAGE_VERSIONS = {
    javascript: { language: "javascript", version: "18.15.0", extension: "js" },
    python: { language: "python", version: "3.10.0", extension: "py" },
    java: { language: "java", version: "15.0.2", extension: "java" },
    cpp: { language: "cpp", version: "10.2.0", extension: "cpp" },
};

export const executeCode = async (language, code, stdin = "") => {
    try {
        const languageConfig = LANGUAGE_VERSIONS[language.toLowerCase()];

        if (!languageConfig) {
            throw new Error(`Unsupported language: ${language}`);
        }

        const payload = {
            language: languageConfig.language,
            version: languageConfig.version,
            files: [
                {
                    name: `main.${languageConfig.extension}`,
                    content: code,
                },
            ],
            stdin: stdin // Pass input mapping
        };

        const startTime = Date.now();
        const response = await axios.post(`${PISTON_API}/execute`, payload);
        const executionTime = Date.now() - startTime;

        const data = response.data;
        const output = data.run.output || "";
        const stderr = data.run.stderr || "";
        const codeStatus = data.run.code; // 0 usually means success

        return {
            success: codeStatus === 0 && !stderr,
            stdout: output,
            stderr: stderr,
            executionTime,
            signal: data.run.signal
        };
    } catch (error) {
        throw new Error(`Failed to execute code: ${error.message}`);
    }
};
