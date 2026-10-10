const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'.',
  testMatch:'live-navigation.spec.js',
  timeout:60000,
  retries:1,
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{baseURL:'https://mfw-platform.onrender.com',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'live-iphone',use:{...devices['iPhone 13'],browserName:'chromium'}},
    {name:'live-desktop',use:{browserName:'chromium',viewport:{width:1440,height:900}}}
  ]
});
