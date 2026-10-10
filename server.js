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

// 1.5 Secure Config Endpoint for Frontend
app.get('/api/config', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    });
});

// 2. Code Execution API Endpoint (Proxies to Piston v1 API)
app.post('/api/execute', async (req, res) => {
    try {
        const { language, files } = req.body;
        
        if (!files || files.length === 0) {
            return res.json({ run: { stderr: "No files provided." } });
        }

        // Map frontend language formats to Piston v1 supported values if needed
        // (c, cpp, python, javascript, java are natively supported)
        let lang = language === 'cpp' ? 'cpp' : language;
        
        // Combine all files for Piston v1 which expects a single 'source' string
        let sourceCode = files.map(f => f.content).join('\n\n');

        const payload = {
            language: lang,
            source: sourceCode
        };

        // Call the Piston Engine v1 (Public API) safely from backend
        const response = await axios.post('https://emkc.org/api/v1/piston/execute', payload);
        
        const pData = response.data;
        const mappedData = {
            run: {
                stdout: pData.stdout || '',
                stderr: pData.stderr || (pData.output && pData.output.includes('Error') ? pData.output : ''),
                code: pData.stderr ? 1 : 0
            }
        };

        res.json(mappedData);

    } catch (error) {
        console.error("Execution Error:", error.message);
        let errorMsg = "Failed to connect to compilation engine.";
        if (error.response && error.response.data && error.response.data.message) {
            errorMsg = error.response.data.message;
        }
        res.status(500).json({ message: errorMsg, raw: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`ORVIX Backend running on http://localhost:${PORT}`);
});
