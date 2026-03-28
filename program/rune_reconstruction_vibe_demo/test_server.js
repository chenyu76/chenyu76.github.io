const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.static(__dirname));

const server = app.listen(3000, async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error));
    
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'load' });
    
    await page.evaluate(() => console.log('Hello from evaluate'));
    await new Promise(r => setTimeout(r, 500));
    await browser.close();
    server.close();
});
