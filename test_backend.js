const axios = require('axios');

async function testSubmit() {
    try {
        console.log("TESTING PROBLEM 1 (Correct Answer)...");
        const correctPayload = {
            problemId: "1",
            code: `
#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d", a + b);
    return 0;
}
            `
        };
        const res1 = await axios.post('http://localhost:5500/api/submit', correctPayload);
        console.log("Verdict:", res1.data.verdict);
        console.log("Cases passed:", res1.data.results.filter(r => r.status === 'Passed').length, "/", res1.data.results.length);
        
        console.log("\nTESTING PROBLEM 1 (Wrong Answer, Hardcoded Sample)...");
        const wrongPayload = {
            problemId: "1",
            code: `
#include <stdio.h>
int main() {
    printf("12");
    return 0;
}
            `
        };
        const res2 = await axios.post('http://localhost:5500/api/submit', wrongPayload);
        console.log("Verdict:", res2.data.verdict);
        console.log("First failing case output:", res2.data.results.find(r => r.status === 'Wrong Answer').output);

        console.log("\nTESTING PROBLEM 1 (Compilation Error)...");
        const compileErrPayload = {
            problemId: "1",
            code: `
#include <stdio.h>
int main() {
    printf("12"n);
    return 0;
}
            `
        };
        const res3 = await axios.post('http://localhost:5500/api/submit', compileErrPayload);
        console.log("Verdict:", res3.data.verdict);
        
    } catch (e) {
        console.error(e.message);
        if (e.response && e.response.data) console.error(e.response.data);
    }
}

testSubmit();
