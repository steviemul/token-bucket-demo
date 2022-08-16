#!/usr/bin/env node
const fs = require('fs');
const browse = require('./browse');
const path = require('path');

const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = HOUR_SECONDS * 24;
const MONTH_SECONDS = DAY_SECONDS * 31;

// How long to simulate length of run for e.g. for 2 months
const RUN_UNTIL = MONTH_SECONDS * 2;
const DELAY_RATE=0;

// Time between each request e.g. per hour
const TIME_TRAVEL_FACTOR = Math.floor(HOUR_SECONDS);

// The 3 params that influence the rate limit
const rate = 1;
const capacity = MONTH_SECONDS;
const requested = Math.floor(MONTH_SECONDS / 200);

const data = {
  rate,
  capacity,
  tokens: requested,
  requests:[]
};

function timeTravel(count) {
  return TIME_TRAVEL_FACTOR * count;
}

const fillTime = capacity / rate;
const ttl = Math.floor(fillTime * 2);

let LAST_TOKENS = capacity;
let LAST_REFRESHED = 0;
let SUCCESSFUL_REQUESTS = 0;

function requestTokens(now) {

  const delta = Math.max(0, now - LAST_REFRESHED);

  const filledTokens = Math.min(capacity, LAST_TOKENS + (delta * rate));
  const allowed = (filledTokens >= requested);

  let newTokens = filledTokens;
  let allowedNum = 0;

  if (allowed) {
    newTokens = filledTokens - requested;
    allowedNum = 1;
  }

  SUCCESSFUL_REQUESTS += allowedNum;

  if (ttl > 0) {
    LAST_TOKENS = newTokens;
    LAST_REFRESHED = now;
  }

  console.log(`Allowed : ${allowedNum === 1}`);
  console.log(`Remaining Tokens : ${newTokens}`);

  data.requests.push({
    ts: now*1000,
    allowedNum,
    newTokens,
    successfulRequests: SUCCESSFUL_REQUESTS
  });
}

function delay(milliseconds){
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

async function simulate() {

  const startTime = Math.floor(Date.now() / 1000);
  const untilTime = startTime + RUN_UNTIL;

  let requestTime = startTime;
  let count = 0;

  while (requestTime < untilTime) {
    console.log('------------------------------------------------------------------');

    requestTime = startTime + timeTravel(count);

    const requestTimeAsString = new Date(requestTime * 1000).toUTCString();

    console.log(`Request number ${count++} at ${requestTimeAsString}`);

    requestTokens(requestTime);

    await delay(DELAY_RATE);
  }

  console.log(`\n\nRate ${rate} | Capacity ${capacity} | Requested ${requested}`);

  const output = `const REQUESTS = ${JSON.stringify(data, null, 2)};`;

  fs.writeFileSync('requests.json', JSON.stringify(data, null, 2));
  fs.writeFileSync('requests.js', output);

  browse(path.join(process.cwd(), 'report.html'));
}

simulate();



