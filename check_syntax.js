const fs = require('fs');
const ts = require('./node_modules/typescript');
const file = process.argv[2];
const prog = ts.createProgram([file], { jsx: ts.JsxEmit.React, noEmit: true, skipLibCheck: true });
const diag = ts.getPreEmitDiagnostics(prog);
let hasError = false;
diag.forEach(d => {
  if (d.file && d.file.fileName.toLowerCase() === file.replace(/\\/g, '/').toLowerCase()) {
     let { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
     let msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
     console.log(`Line ${line + 1}: ${msg}`);
     hasError = true;
  }
});
if (!hasError) console.log("No syntax errors found in " + file);
