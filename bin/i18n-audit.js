#!/usr/bin/env node

const path = require("path");

const auditPath = path.join(__dirname, "..", "scripts", "i18n-audit.cjs");
require(auditPath);
