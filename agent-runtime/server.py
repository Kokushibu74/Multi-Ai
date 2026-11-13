"""Loopback-only, zero-cost-first Multi-AI agent sidecar prototype."""
from __future__ import annotations
import json, os, re, secrets, sqlite3, time, urllib.parse, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("MULTIAI_AGENT_DATA", ROOT / "data"))
DB_PATH = DATA_DIR / "agent-runtime.sqlite3"
API_BASE = os.environ.get("MULTIAI_API_BASE", "https://multi-ai-memory-api.mdshihab74.workers.dev").rstrip("/")
TOKEN = os.environ.get("MULTIAI_AGENT_TOKEN", "")
HOST = os.environ.get("MULTIAI_AGENT_HOST", "127.0.0.1")
PORT = int(os.environ.get("MULTIAI_AGENT_PORT", "8765"))
MAX_BODY, MAX_TEXT = 65536, 20000

SOURCES = {
 "browser_use": {"repository":"https://github.com/browser-use/browser-use","license":"MIT","role":"Browser automation","status":"optional_dependency_gated"},
 "agentmemory": {"repository":"https://github.com/rohitg00/agentmemory","license":"Apache-2.0","role":"Persistent agent memory","status":"project_scoped_local_adapter"},
 "scientific_agent_skills": {"repository":"https://github.com/K-Dense-AI/scientific-agent-skills","license":"MIT","role":"Scientific skills","status":"catalog_only_until_selected"},
 "diagram_design": {"repository":"https://github.com/cathrynlavery/diagram-design","license":"MIT","role":"Diagram design","status":"Mermaid_prototype"},
 "cybersecurity_skills": {"repository":"https://github.com/mukul975/Anthropic-Cybersecurity-Skills","license":"Apache-2.0","role":"Defensive security","status":"Static_audit_prototype"},
 "awesome_harness_engineering": {"repository":"https://github.com/walkinglabs/awesome-harness-engineering","license":"CC0-1.0","role":"Agent reliability","status":"Validation_and_task_logs"},
 "openviking": {"repository":"https://github.com/volcengine/OpenViking","license":"AGPL-3.0","role":"Knowledge and context database","status":"External_service_not_embedded"}
}

def db_connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=5)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY, project TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS task_runs(id TEXT PRIMARY KEY, capability TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, duration_ms INTEGER NOT NULL, summary_json TEXT)")
    db.commit()
    return db

class MemoryStore:
    """Local prototype adapter; production Cloudflare D1 remains authoritative."""
    def add(self, project, text):
        text = str(text).strip()
        if not text: raise ValueError("Memory text is required")
        item = {"id":str(uuid.uuid4()),"project":project,"text":text[:2000],"createdAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
        with db_connect() as db:
            db.execute("INSERT INTO memories VALUES(?,?,?,?)",(item["id"],project,item["text"],item["createdAt"]))
            db.execute("DELETE FROM memories WHERE project=? AND id NOT IN (SELECT id FROM memories WHERE project=? ORDER BY created_at DESC LIMIT 500)",(project,project))
        return item
    def search(self, project, query, limit=10):
        terms = [x.lower() for x in re.findall(r"[\w\u0980-\u09ff]+",str(query)) if len(x)>1]
        with db_connect() as db:
            rows = db.execute("SELECT * FROM memories WHERE project=? ORDER BY created_at DESC LIMIT 500",(project,)).fetchall()
        ranked=[]
        for row in rows:
            score=sum(row["text"].lower().count(term) for term in terms)
            if score or not terms: ranked.append((score,dict(row)))
        ranked.sort(key=lambda x:(x[0],x[1]["created_at"]),reverse=True)
        return [{"id":r["id"],"project":r["project"],"text":r["text"],"createdAt":r["created_at"],"score":score} for score,r in ranked[:max(1,min(int(limit),20))]]

def research_search(query):
    query=str(query).strip()[:200]
    if len(query)<2: raise ValueError("Search query must contain at least 2 characters")
    url=API_BASE+"/api/search?"+urllib.parse.urlencode({"q":query})
    req=urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"MultiAI-AgentRuntime/0.1"})
    with urllib.request.urlopen(req,timeout=10) as response:
        data=json.loads(response.read(256000).decode("utf-8"))
    return {"provider":"existing-multi-ai-search","query":query,"results":data.get("results",[])[:8],"retrievedAt":data.get("retrievedAt")}

def make_diagram(payload):
    nodes,edges=payload.get("nodes"),payload.get("edges",[])
    if not isinstance(nodes,list) or not 1<=len(nodes)<=30: raise ValueError("Diagram requires 1–30 nodes")
    if not isinstance(edges,list) or len(edges)>60: raise ValueError("Diagram supports at most 60 edges")
    def clean(v): return re.sub(r'[\r\n\[\]{}<>"]'," ",str(v))[:100].strip() or "Step"
    lines=["flowchart TD"]
    for i,node in enumerate(nodes):
        label=clean(node.get("label",f"Step {i+1}") if isinstance(node,dict) else node)
        lines.append(f'  N{i+1}["{label}"]')
    for edge in edges:
        if isinstance(edge,dict):
            try: a,b=int(edge.get("from")),int(edge.get("to"))
            except (TypeError,ValueError): continue
            if 0<=a<len(nodes) and 0<=b<len(nodes): lines.append(f"  N{a+1} --> N{b+1}")
    return {"format":"mermaid","source":"\n".join(lines)}

RULES=[
 ("possible_api_key",re.compile(r"""(?i)(api[_-]?key|secret|access[_-]?token)\s*[:=]\s*['"][^'"]{12,}['"]"""),"high"),
 ("private_key",re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),"high"),
 ("hardcoded_credential",re.compile(r"""(?i)(password|passwd)\s*[:=]\s*['"][^'"]{6,}['"]"""),"high"),
 ("dynamic_code_execution",re.compile(r"\beval\s*\("),"medium"),
 ("unsafe_shell_execution",re.compile(r"subprocess\.(?:run|Popen|call)\([^\n]*shell\s*=\s*True"),"medium"),
 ("disabled_tls_verification",re.compile(r"(?i)(verify\s*=\s*False|rejectUnauthorized\s*:\s*false)"),"medium")
]
def security_audit(payload):
    source=str(payload.get("source",""))[:MAX_TEXT]
    if not source: raise ValueError("Provide source text to audit")
    findings=[]
    for line_no,line in enumerate(source.splitlines(),1):
        for rule,pattern,severity in RULES:
            if pattern.search(line):
                safe=re.sub(r"""(?i)(api[_-]?key|secret|access[_-]?token|password|passwd)(\s*[:=]\s*)['"][^'"]+['"]""",r"\1\2'[REDACTED]'",line.strip())
                safe=re.sub(r"-----BEGIN .*?PRIVATE KEY-----","[PRIVATE KEY REDACTED]",safe)
                findings.append({"rule":rule,"line":line_no,"severity":severity,"evidence":safe[:180]})
    return {"scope":"static-text-only","findings":findings,"findingCount":len(findings),"note":"Prototype only; no code execution or network scanning."}

def record_task(task_id,capability,status,started,summary):
    duration=int((time.monotonic()-started)*1000)
    with db_connect() as db:
        db.execute("INSERT INTO task_runs VALUES(?,?,?,?,?,?)",(task_id,capability,status,time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),duration,json.dumps(summary,ensure_ascii=False)[:5000]))

def run_task(body):
    capability=str(body.get("capability",""))
    payload=body.get("input") if isinstance(body.get("input"),dict) else {}
    project=re.sub(r"[^a-zA-Z0-9_.-]","_",str(body.get("project","default")))[:64] or "default"
    task_id,started=str(uuid.uuid4()),time.monotonic()
    try:
        if capability=="memory.add":
            result=MemoryStore().add(project,payload.get("text","")); summary={"saved":True,"project":project}
        elif capability=="memory.search":
            items=MemoryStore().search(project,payload.get("query",""),payload.get("limit",10)); result={"items":items}; summary={"resultCount":len(items),"project":project}
        elif capability=="research.search":
            result=research_search(payload.get("query","")); summary={"resultCount":len(result["results"])}
        elif capability=="diagram.generate":
            result=make_diagram(payload); summary={"nodeCount":len(payload.get("nodes",[]))}
        elif capability=="security.audit":
            result=security_audit(payload); summary={"findingCount":result["findingCount"],"rules":sorted({x["rule"] for x in result["findings"]})}
        elif capability=="scientific.catalog":
            result={"source":SOURCES["scientific_agent_skills"],"status":"catalog-only","message":"Upstream declares MIT in LICENSE.md; select individual skills only after checking dependencies and external-service requirements."}; summary={"catalogListed":True}
        elif capability=="browser.status":
            try: import browser_use  # noqa: F401
            except ImportError: installed=False
            else: installed=True
            configured=bool(os.environ.get("BROWSER_USE_MODEL"))
            result={"installed":installed,"modelConfigured":configured,"ready":False,"message":"Execution is gated until a reviewed read-only adapter, local model, and browser network restrictions are configured."}; summary={"packageInstalled":installed,"modelConfigured":configured}
        elif capability=="knowledge.status":
            configured=bool(os.environ.get("OPENVIKING_BASE_URL"))
            result={"configured":configured,"ready":False,"license":"AGPL-3.0","message":"OpenViking is a separate optional service; this prototype neither installs nor contacts it."}; summary={"configured":configured}
        elif capability=="harness.status":
            with db_connect() as db: count=db.execute("SELECT COUNT(*) AS n FROM task_runs").fetchone()["n"]
            result={"recordedTasks":count,"checks":["capability allowlist","64 KB request limit","bounded task inputs","privacy-minimized task summaries"]}; summary={"recordedTasks":count}
        else:
            return 400,{"error":"Unknown capability","allowed":["memory.add","memory.search","research.search","diagram.generate","security.audit","scientific.catalog","browser.status","knowledge.status","harness.status"]}
        record_task(task_id,capability,"completed",started,summary)
        return 200,{"ok":True,"taskId":task_id,"capability":capability,"result":result}
    except (ValueError,TypeError) as exc:
        record_task(task_id,capability,"rejected",started,{"validationError":str(exc)[:160]})
        return 400,{"ok":False,"taskId":task_id,"error":str(exc)}
    except Exception as exc:
        record_task(task_id,capability,"failed",started,{"errorType":type(exc).__name__})
        return 503,{"ok":False,"taskId":task_id,"error":"Capability temporarily unavailable"}

class Handler(BaseHTTPRequestHandler):
    server_version="MultiAIAgentRuntime/0.1"
    def send_json(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw))); self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff"); self.end_headers(); self.wfile.write(raw)
    def authorized(self):
        return bool(TOKEN) and secrets.compare_digest(self.headers.get("X-Agent-Token",""),TOKEN)
    def do_GET(self):
        if self.path=="/health": return self.send_json(200,{"ok":True,"service":"multi-ai-agent-runtime","mode":"local-prototype"})
        if self.path=="/v1/capabilities":
            if not self.authorized(): return self.send_json(401,{"error":"Agent token required"})
            return self.send_json(200,{"capabilities":SOURCES})
        return self.send_json(404,{"error":"Not found"})
    def do_POST(self):
        if self.path!="/v1/tasks": return self.send_json(404,{"error":"Not found"})
        if not self.authorized(): return self.send_json(401,{"error":"Agent token required"})
        try: length=int(self.headers.get("Content-Length","0"))
        except ValueError: return self.send_json(400,{"error":"Invalid Content-Length"})
        if length<2 or length>MAX_BODY: return self.send_json(413,{"error":"Body must be 2 bytes to 64 KB"})
        try:
            body=json.loads(self.rfile.read(length))
            if not isinstance(body,dict): raise ValueError()
        except (json.JSONDecodeError,ValueError): return self.send_json(400,{"error":"Valid JSON object required"})
        status,result=run_task(body)
        return self.send_json(status,result)
    def log_message(self,fmt,*args):
        print("[agent-runtime] "+(fmt%args).split("?")[0])

def main():
    if HOST not in {"127.0.0.1","localhost","::1"}:
        raise SystemExit("Prototype refuses non-loopback binding; use a reviewed gateway for remote access.")
    if len(TOKEN)<32: raise SystemExit("Set MULTIAI_AGENT_TOKEN to a random secret of at least 32 characters.")
    server=ThreadingHTTPServer((HOST,PORT),Handler)
    print(f"Multi-AI Agent Runtime: http://{HOST}:{PORT} (loopback only; no production tunnel)")
    server.serve_forever()

if __name__=="__main__": main()
