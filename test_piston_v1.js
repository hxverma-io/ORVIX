const axios = require('axios');

async function testPiston() {
    try {
        const payload = {
            language: "c",
            source: `
#include <stdio.h>
int main() {
    int a;
    scanf("%d", &a);
    printf("Output: %d\\n", a * 2);
    return 0;
}
            `,
            stdin: "5"
        };
        const res = await axios.post('https://emkc.org/api/v1/piston/execute', payload);
        console.log(res.data);
    } catch (e) {
        console.error(e.message);
    }
}
testPiston();
