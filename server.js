const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());

// Serve Static Files
app.use(express.static(path.join(__dirname, '')));

// Compiler Map (Piston/Frontend -> Wandbox)
const compilerMap = {
    'c': 'gcc-head-c',
    'cpp': 'gcc-head',
    'python': 'cpython-3.11.10',
    'javascript': 'nodejs-20.17.0',
    'java': 'openjdk-jdk-21+35'
};

// 1.5 Secure Config Endpoint for Frontend
app.get('/api/config', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    });
});

// 2. Code Execution API Endpoint (Proxies to Wandbox API)
app.post('/api/execute', async (req, res) => {
    try {
        const { language, files } = req.body;
        
        if (!files || files.length === 0) {
            return res.json({ run: { stderr: "No files provided." } });
        }

        const compiler = compilerMap[language] || 'gcc-head-c';
        
        // Find main file for the code body (first file usually)
        let mainCode = files[0].content;
        let otherFiles = [];
        
        // If there are multiple files, Wandbox handles them in 'codes' array
        if (files.length > 1) {
            for (let i = 1; i < files.length; i++) {
                otherFiles.push({
                    file: files[i].name,
                    code: files[i].content
                });
            }
        }

        const payload = {
            compiler: compiler,
            code: mainCode,
            codes: otherFiles,
            save: false
        };

        // Call the Wandbox Engine (Public API) safely from backend
        const response = await axios.post('https://wandbox.org/api/compile.json', payload);
        
        // Map Wandbox response back to Piston-like format so frontend doesn't need changes
        const wData = response.data;
        const mappedData = {
            run: {
                stdout: wData.program_output || wData.compiler_message || '',
                stderr: wData.program_error || wData.compiler_error || '',
                code: wData.status === '0' ? 0 : 1
            }
        };

        res.json(mappedData);

    } catch (error) {
        console.error("Execution Error:", error.message);
        res.status(500).json({ message: "Failed to connect to compilation engine.", raw: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`ORVIX Backend running on http://localhost:${PORT}`);
});
