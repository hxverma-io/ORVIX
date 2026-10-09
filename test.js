const axios = require('axios');

async function testWandbox() {
    try {
        const response = await axios.post('https://wandbox.org/api/compile.json', {
            compiler: 'gcc-head-c',
            code: '#include <stdio.h>\nint main() { printf("Hello Wandbox!\\n"); return 0; }'
        });
        console.log("Success:", response.data);
    } catch (err) {
        console.log("Error:", err.message);
        if (err.response) console.log(err.response.data);
    }
}
testWandbox();
