const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// Vercel auto-traces this requirement during build
const problemsData = require('../data/problems.json');

const app = express();

app.use(cors());
app.use(express.json());

// In Vercel, static files are handled by vercel.json rewrites, 
// but we keep this for local development if run directly.
app.use(express.static(path.join(__dirname, '..')));

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

// 0. Secure Config Endpoint for Frontend (Supabase keys)
app.get('/api/config', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    });
});

// 1. Get Problem Public Data
app.get('/api/problems/:id', (req, res) => {
    const prob = problemsData.find(p => p.id === req.params.id);
    if (!prob) return res.status(404).json({ error: "Problem not found" });
    
    const publicProb = { ...prob };
    delete publicProb.testCases;
    res.json(publicProb);
});

// 2. RUN CODE (Sample Case Only)
app.post('/api/run', async (req, res) => {
    try {
        const { code, problemId } = req.body;
        if (!code || !problemId) return res.status(400).json({ error: "Missing code or problemId" });

        const prob = problemsData.find(p => p.id === problemId);
        if (!prob) return res.status(404).json({ error: "Problem not found" });

        const tc = prob.examples[0];
        
        const pData = await executeOnPiston(code, tc.input);
        
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
                break;
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
                break;
            }
            
            if (i < prob.testCases.length - 1) {
                await sleep(500); 
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

// Export the Express App for Vercel Serverless
module.exports = app;

// Local Development Support
if (require.main === module) {
    const PORT = 5500;
    app.listen(PORT, () => {
        console.log(`ORVIX Local Dev Server running on http://localhost:${PORT}`);
    });
}
