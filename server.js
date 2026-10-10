const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());

// Serve Static Files
app.use(express.static(path.join(__dirname, '')));

// Load Problems Database
const problemsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'problems.json'), 'utf8'));

// 1. Get Problem Public Data
app.get('/api/problems/:id', (req, res) => {
    const prob = problemsData.find(p => p.id === req.params.id);
    if (!prob) return res.status(404).json({ error: "Problem not found" });
    
    // Omit hidden testCases for public API
    const publicProb = { ...prob };
    delete publicProb.testCases;
    res.json(publicProb);
});

// Helper: Run code on Piston v1 with retry logic for 429 Rate Limits
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function executeOnPiston(code, stdin, retries = 3) {
    const payload = {
        language: "c",
        source: code,
        stdin: stdin || ""
    };
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post('https://emkc.org/api/v1/piston/execute', payload);
            return response.data;
        } catch (err) {
            if (err.response && err.response.status === 429) {
                console.log(`Rate limited by Piston. Retrying in ${1000 * (i + 1)}ms...`);
                await sleep(1000 * (i + 1));
            } else {
                throw err;
            }
        }
    }
    throw new Error("Piston API Rate Limit Exceeded");
}

// 2. RUN CODE (Sample Case Only)
app.post('/api/run', async (req, res) => {
    try {
        const { code, problemId } = req.body;
        if (!code || !problemId) return res.status(400).json({ error: "Missing code or problemId" });

        const prob = problemsData.find(p => p.id === problemId);
        if (!prob) return res.status(404).json({ error: "Problem not found" });

        // Run only the first example case
        const tc = prob.examples[0];
        
        const pData = await executeOnPiston(code, tc.input);
        
        // Piston v1 mixes stdout/stderr sometimes. We prefer stdout, fallback to output if no error
        const stderr = pData.stderr || (pData.output && pData.output.includes('error:') ? pData.output : '');
        const stdout = pData.stdout ? pData.stdout.trim() : (pData.output && !pData.output.includes('error:') ? pData.output.trim() : '');

        res.json({
            stderr: stderr,
            stdout: stdout,
            input: tc.input,
            expected: tc.output
        });

    } catch (error) {
        console.error("Run Error:", error.message);
        res.status(500).json({ error: "Execution engine unavailable" });
    }
});

// 3. SUBMIT SOLUTION (All Hidden Cases)
app.post('/api/submit', async (req, res) => {
    try {
        const { code, problemId } = req.body;
        if (!code || !problemId) return res.status(400).json({ error: "Missing code or problemId" });

        const prob = problemsData.find(p => p.id === problemId);
        if (!prob) return res.status(404).json({ error: "Problem not found" });

        const results = [];
        let allPassed = true;
        let hasCompileError = false;

        for (let i = 0; i < prob.testCases.length; i++) {
            const tc = prob.testCases[i];
            
            const pData = await executeOnPiston(code, tc.input);
            
            const stderr = pData.stderr || (pData.output && pData.output.includes('error:') ? pData.output : '');
            if (stderr) {
                allPassed = false;
                hasCompileError = true;
                results.push({
                    caseNumber: i + 1,
                    status: "Compilation/Runtime Error",
                    error: stderr,
                    input: tc.input
                });
                break; // Stop testing on compile/runtime error
            }

            const stdout = pData.stdout ? pData.stdout.trim() : (pData.output ? pData.output.trim() : "");
            const expected = tc.expected.trim();

            if (stdout === expected) {
                results.push({
                    caseNumber: i + 1,
                    status: "Passed",
                    input: tc.input,
                    output: stdout,
                    expected: expected
                });
            } else {
                allPassed = false;
                results.push({
                    caseNumber: i + 1,
                    status: "Wrong Answer",
                    input: tc.input,
                    output: stdout,
                    expected: expected
                });
                break; // Stop testing on first fail
            }
            
            if (i < prob.testCases.length - 1) {
                await sleep(500); // 500ms delay between tests to respect API limits
            }
        }

        let finalVerdict = "Accepted";
        if (!allPassed) {
            finalVerdict = hasCompileError ? "Compilation Error" : "Wrong Answer";
        }

        res.json({
            verdict: finalVerdict,
            results: results
        });

    } catch (error) {
        console.error("Submit Error:", error.message);
        res.status(500).json({ error: "Execution engine unavailable" });
    }
});


// Legacy endpoint for playground.html (General execution without strict problem constraints)
app.post('/api/execute', async (req, res) => {
    try {
        const { language, files } = req.body;
        if (!files || files.length === 0) return res.json({ run: { stderr: "No files provided." } });

        let lang = language === 'cpp' ? 'cpp' : language;
        let sourceCode = files.map(f => f.content).join('\n\n');

        const payload = { language: lang, source: sourceCode };
        const response = await axios.post('https://emkc.org/api/v1/piston/execute', payload);
        
        const pData = response.data;
        const mappedData = {
            run: {
                stdout: pData.stdout || '',
                stderr: pData.stderr || (pData.output && pData.output.includes('error:') ? pData.output : ''),
                code: pData.stderr ? 1 : 0
            }
        };
        res.json(mappedData);

    } catch (error) {
        console.error("Execution Error:", error.message);
        res.status(500).json({ message: "Failed to connect to compilation engine." });
    }
});


app.listen(PORT, () => {
    console.log(`ORVIX Backend running on http://localhost:${PORT}`);
});
