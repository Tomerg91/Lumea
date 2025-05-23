    // server/test-env.js
    require('dotenv').config({ path: '.env' }); 
    console.log('--- test-env.js output ---');
    console.log('DATABASE_URL from env is: >>>' + process.env.DATABASE_URL + '<<<');
    console.log('--- end of test-env.js output ---');