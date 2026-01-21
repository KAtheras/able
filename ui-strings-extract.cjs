const fs = require("fs");
const ts = require("typescript");

const filePath = "src/app/page.tsx";
const src = fs.readFileSync(filePath, "utf8");
const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const results = [];
const seen = new Set();

function norm(s){ return s.replace(/\s+/g," ").trim(); }

function add(locNode, text){
  const t = norm(text);
  if (!t) return;
  if (!/[A-Za-z]/.test(t)) return;
  if (t.length < 3) return;
  if (/^(true|false|null|undefined)$/i.test(t)) return;
  if (/^[A-Za-z0-9_.:-]+$/.test(t)) return;

  const { line } = sf.getLineAndCharacterOfPosition(locNode.getStart(sf));
  const key = `${line+1}:${t}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push(key);
}

function visit(node){
  if (node.kind === ts.SyntaxKind.JsxText) add(node, node.getText(sf));
  if (ts.isJsxAttribute(node)) {
    const name = node.name?.getText(sf) || "";
    if (name !== "className" && node.initializer && ts.isStringLiteral(node.initializer)) {
      add(node.initializer, node.initializer.text);
    }
  }
  ts.forEachChild(node, visit);
}

visit(sf);
results.sort((a,b)=>{
  const la = parseInt(a.split(":")[0],10);
  const lb = parseInt(b.split(":")[0],10);
  return la-lb;
});

fs.writeFileSync("ui-strings.page.tsx.txt", results.join("\n") + "\n", "utf8");
console.log("WROTE ui-strings.page.tsx.txt", results.length);
