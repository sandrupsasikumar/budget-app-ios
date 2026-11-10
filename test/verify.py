import subprocess, json, openpyxl, shutil, os, sys
shutil.copy("src/logic.js","/tmp/logic.mjs")
js = r'''
import * as L from "/tmp/logic.mjs";
import fs from "fs";
const seed = JSON.parse(fs.readFileSync("test/fixtures/real-seed.json","utf8"));
const out = {};
for (let m=1;m<=12;m++) out[m]=L.dashboard(seed,2026,m);
out.year = L.yearTable(seed,2026); out.heat = L.heatmap(seed,2026); out.plan = L.planSummary(seed.recurring); out.trips = L.tripTotals(seed.recurring.trips);
const csv = L.transactionsToCsv(seed.transactions);
const back = L.csvToTransactions(csv, seed.categories);
out.csvRoundTrip = back.transactions.length + "/" + seed.transactions.length + " skipped " + back.skipped;
out.csvSame = JSON.stringify(back.transactions.map(t=>[t.date,t.amount,t.category,t.description]))===JSON.stringify([...seed.transactions].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).map(t=>[t.date,t.amount,t.category,t.description]));
console.log(JSON.stringify(out));
'''
r = subprocess.run(["node","--input-type=module","-e",js],capture_output=True,text=True)
if r.returncode: print(r.stderr); sys.exit(1)
o = json.loads(r.stdout)
wv = openpyxl.load_workbook("/root/.claude/uploads/d622fe5c-ff26-58c4-ae92-1fd3971c3f5e/fea82bba-Budgetting_Sheet.xlsx",data_only=True)
d = wv["Dashboard"]; pr = wv["Planned & Recurring"]
bad=0; n=0
def chk(name,a,b,tol=0.005):
    global bad,n; n+=1
    if a is None and b in (None,""): return
    if abs(float(a)-float(b))>tol: bad+=1; print("MISMATCH",name,a,b)
d10 = o["10"]
chk("income",d10["income"],d["A7"].value); chk("spend",d10["spending"],d["B7"].value)
chk("net",d10["net"],d["D7"].value); chk("rate",d10["savingsRate"],d["F7"].value); chk("used",d10["budgetUsed"],d["H7"].value)
chk("unmatched",d10["unmatched"],d["C23"].value)
# every month's category table vs sheet logic: compare Oct rows to sheet rows, other months via heatmap
for i,row in enumerate(d10["rows"]):
    r=11+i
    assert d.cell(r,1).value==row["category"],(d.cell(r,1).value,row["category"])
    for k,c in [("budget",2),("actual",3),("remaining",4),("ytdActual",7),("ytdBudget",8)]: chk(row["category"]+k,row[k],d.cell(r,c).value)
    if row["pctUsed"] is not None: chk(row["category"]+"pct",row["pctUsed"],d.cell(r,5).value)
    n+=1
    if row["status"]!=d.cell(r,6).value: bad+=1; print("STATUS",row["category"],row["status"],d.cell(r,6).value)
chk("tot actual",d10["totals"]["actual"],d["C22"].value); chk("tot ytd",d10["totals"]["ytdActual"],d["G22"].value); chk("tot ytdb",d10["totals"]["ytdBudget"],d["H22"].value)
if d10["totals"]["status"]!=d["F22"].value: bad+=1; print("TOTAL STATUS")
for i,m in enumerate(o["year"]["months"]):
    r=27+i
    chk("yr inc"+str(i),m["income"],d.cell(r,2).value); chk("yr sp"+str(i),m["spending"],d.cell(r,3).value); chk("yr net"+str(i),m["net"],d.cell(r,4).value)
    if m["rate"] is not None: chk("yr rate"+str(i),m["rate"],d.cell(r,5).value)
t=o["year"]["total"]
chk("yt inc",t["income"],d["B39"].value); chk("yt sp",t["spending"],d["C39"].value); chk("yt rate",t["rate"],d["E39"].value)
for gi,g in enumerate(o["heat"]["grid"]):
    for mi,v in enumerate(g["cells"]): chk("heat",v,d.cell(43+gi,2+mi).value)
    chk("heat tot",g["total"],d.cell(43+gi,14).value)
chk("plan year",o["plan"]["totalYear"],pr["B10"].value); chk("plan month",o["plan"]["totalMonth"],pr["C10"].value)
for l,r in zip(o["plan"]["lines"],range(6,10)): chk(l["label"],l["perYear"],pr.cell(r,2).value)
for tr,r in zip(o["trips"],range(89,92)): chk(tr["group"],tr["total"],pr.cell(r,2).value)
# status test on other months: re-derive with sheet formula from the cached sheet thresholds
print("checks:",n,"mismatches:",bad); print("csv round trip:",o["csvRoundTrip"],o["csvSame"])
