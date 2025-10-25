const fetch = require('node-fetch');

async function quickTest() {
    console.log('Testing email and name capture in single message...\n');

    const response = await fetch('https://ai-bot-special.lenilani.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'Hi! My email is finaltest@example.com and my name is Final Tester',
            sessionId: 'quick-test-' + Date.now(),
            language: 'english'
        })
    });

    const data = await response.json();

    console.log('Email Captured:', data.emailCaptured ? 'YES ✅' : 'NO ❌');
    console.log('Name Captured:', data.nameCaptured ? 'YES ✅' : 'NO ❌');
    console.log('HubSpot Lead Created:', data.leadCaptured ? 'YES ✅' : 'NO ❌');
    console.log('\nContact Info:', data.contactInfo);
    console.log('\nResponse:', data.response?.substring(0, 100) + '...');
}

quickTest().catch(console.error);
