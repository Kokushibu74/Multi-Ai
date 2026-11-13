import json, tempfile, unittest
from pathlib import Path
import server

class AgentRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.old_data,self.old_db=server.DATA_DIR,server.DB_PATH
        server.DATA_DIR=Path(self.tmp.name); server.DB_PATH=server.DATA_DIR/"test.sqlite3"
    def tearDown(self):
        server.DATA_DIR= self.old_data
        server.DB_PATH=self.old_db
        self.tmp.cleanup()
    def test_project_scoped_memory_search(self):
        store=server.MemoryStore()
        store.add("verity","RSS source validation decision")
        store.add("portfolio","Hero animation decision")
        self.assertEqual(len(store.search("verity","RSS source")),1)
        self.assertEqual(len(store.search("portfolio","RSS source")),0)
    def test_diagram_returns_bounded_mermaid(self):
        result=server.make_diagram({"nodes":["RSS","Telegram"],"edges":[{"from":0,"to":1}]})
        self.assertEqual(result["format"],"mermaid")
        self.assertIn("N1 --> N2",result["source"])
        with self.assertRaises(ValueError): server.make_diagram({"nodes":[]})
    def test_security_audit_redacts_detected_secret(self):
        result=server.security_audit({"source":'API_KEY = "sk-123456789012345678"\neval(user_input)'})
        rules={x["rule"] for x in result["findings"]}
        self.assertIn("possible_api_key",rules); self.assertIn("dynamic_code_execution",rules)
        self.assertNotIn("sk-123456789012345678",json.dumps(result))
    def test_unknown_capability_is_rejected(self):
        status,result=server.run_task({"capability":"shell.exec","input":{"cmd":"whoami"}})
        self.assertEqual(status,400); self.assertIn("error",result)
    def test_harness_records_task_summaries(self):
        status,_=server.run_task({"capability":"diagram.generate","input":{"nodes":["A"]}})
        self.assertEqual(status,200)
        status,result=server.run_task({"capability":"harness.status"})
        self.assertEqual(status,200); self.assertGreaterEqual(result["result"]["recordedTasks"],1)
    def test_all_seven_upstream_sources_are_registered(self):
        self.assertEqual(len(server.SOURCES),7)
        self.assertEqual(server.SOURCES["openviking"]["license"],"AGPL-3.0")
        self.assertEqual(server.SOURCES["scientific_agent_skills"]["license"],"MIT")
if __name__=="__main__": unittest.main()
