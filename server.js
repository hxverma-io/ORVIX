// This file exists to satisfy Vercel's Node.js builder which expects a root entrypoint.
// It literally requires express so Vercel's AST parser passes the build.
const express = require('express');
const app = require('./api/index.js');

module.exports = app;
