import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

function app(){
  const html=fs.readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
  const storage=new Map();
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const context=vm.createContext({console,Intl,Date,Math,URLSearchParams,localStorage,sessionStorage:localStorage,window:{},location:{hostname:'',protocol:'file:',search:''},setTimeout:()=>0,clearTimeout:()=>{}});
  for(const file of ['forecast-reliability.js','financial-action-planner.js','fin-locale.js'])vm.runInContext(fs.readFileSync(new URL('../app/src/main/assets/'+file,import.meta.url),'utf8'),context);
  const source=html.match(/<script>\s*const INR=([\s\S]*?)<\/script>/)[1].replace(/if\(typeof window\.addEventListener[\s\S]*$/,'');
  vm.runInContext('const INR='+source+`;renderAll=()=>{};globalThis.flow={load(rows,profile){txs=rows;financialState=profile;localStorage.setItem('finLastImport',JSON.stringify({source:'csv-import',count:rows.length}));calculate();return model},update(row){beginFinancialChange('Test update');txs.push(row);calculate('transaction-update');return {model,change:getLastChange(),plan:FinActionPlanner.buildPlans(plannerInput())}},debt(value){beginFinancialChange('Debt corrected');financialState={...financialState,totalDebt:value};calculate('debt-update');return{model,change:getLastChange()}},plan(){return FinActionPlanner.buildPlans(plannerInput())},profile:defaultFinancialHistory,summary:()=>healthDimensionDetails(),payload:()=>buildCopilotPayload('What changed?')};`,context);
  return {flow:context.flow,context,localStorage};
}
const rows=()=>Array.from({length:6},(_,i)=>[
 {id:'i'+i,date:`2026-${String(i+4).padStart(2,'0')}-01`,description:'Salary',amount:60000,category:'Income'},
 {id:'r'+i,date:`2026-${String(i+4).padStart(2,'0')}-02`,description:'Rent',amount:-18000,category:'Housing'},
 {id:'d'+i,date:`2026-${String(i+4).padStart(2,'0')}-03`,description:'Loan EMI',amount:-5000,category:'Debt'},
 {id:'f'+i,date:`2026-${String(i+4).padStart(2,'0')}-15`,description:'Groceries',amount:-8000,category:'Groceries'}
]).flat();
const profile=()=>({cashBalance:40000,liquidSavings:20000,investments:0,totalDebt:100000,emergencyFund:20000,creditScore:0,creditUsed:0,creditLimit:0,updatedAt:'2026-09-30',history:[]});

test('actual app pipeline recalculates imported history, expense shock and debt correction',()=>{
  const {flow}=app();const before=flow.load(rows(),profile());const original=flow.plan();
  assert.equal(before.records,24);assert.equal(before.dimensions.credit,null);
  assert.equal(flow.summary().length,4);
  const updated=flow.update({id:'shock',date:'2026-09-20',description:'Hospital',amount:-60000,category:'Health'});
  assert.ok(updated.model.expense90>before.expense90);
  assert.ok(updated.change.after.expense90>updated.change.before.expense90);
  assert.notDeepEqual(JSON.stringify(updated.plan),JSON.stringify(original));
  const debt=flow.debt(250000);
  assert.equal(debt.change.after.totalDebt,250000);
  assert.ok(debt.model.debtPressure>before.debtPressure);
});

test('missing history withholds snapshot risk and excludes unknown credit',()=>{
  const {flow}=app();flow.load(rows().slice(-4),profile());
  const result=flow.update({id:'small',date:'2026-09-21',description:'Groceries',amount:-500,category:'Groceries'});
  assert.equal(result.change.before.gapProbability,null);
  assert.equal(result.change.after.gapProbability,null);
  assert.equal(result.model.healthWeights.credit,0);
});

test('zero-income months remain in the autonomous profile',()=>{
  const {flow}=app();const data=rows().filter(row=>!['i2','i3','i4','i5'].includes(row.id));flow.load(data,profile());
  assert.equal(flow.plan().input.monthlyIncome,0);
});

test('an imported statement cannot invent cash and unknown credit is not penalized',()=>{
  const {flow}=app();
  const missing=flow.load(rows(),null);
  assert.equal(missing.balance,0);
  assert.equal(missing.validation.eligibility.canShowProbability,false);
  const known=flow.load(rows(),{...profile(),cashBalance:0,creditLimit:100000,creditScore:0});
  assert.equal(known.profileVerified,true);
  assert.equal(known.balance,0);
  assert.equal(known.healthWeights.credit,0);
});

test('requirement evidence: four scenarios, constraints, forecasts and held-out outcomes',()=>{
  const {flow,context}=app();const histories=rows();const model=flow.load(histories,profile());
  const baseline=flow.plan();
  const scenarios=Object.fromEntries(['stable','income-reduction','essential-shock','infeasible'].map(scenario=>[scenario,context.FinActionPlanner.buildPlans({...baseline.input,scenario,monthlySavingsGoal:scenario==='infeasible'?100000:baseline.input.monthlySavingsGoal})]));
  assert.equal(scenarios.stable.sequences.length,3);
  assert.ok(scenarios.infeasible.sequences.every(s=>s.feasibility.infeasible));
  assert.ok(model.validation.backtests.length>0);
  const accuracy=model.validation.metrics.horizons[30];
  assert.ok(Number.isFinite(accuracy.p50Mae)&&Number.isFinite(accuracy.baselineMae));
  assert.ok(accuracy.intervalCoverage>=0&&accuracy.intervalCoverage<=1);
  assert.ok(accuracy.meanIntervalWidth>=0);
  const uncertaintyDemo=context.FinActionPlanner.buildPlans({startingCash:30000,monthlyIncome:60000,incomeSd:4000,essentialExpenses:30000,essentialSd:3000,debtMinimum:6000,discretionaryBaseline:10000,monthlySavingsGoal:8000,totalDebt:100000,minimumReserve:20000});
  assert.ok(uncertaintyDemo.uncertaintyChangedPreference);
  if(process.env.FIN_EXPORT_EVIDENCE==='1'){
    const target=new URL('../build/reports/requirements-evidence.json',import.meta.url);
    fs.mkdirSync(new URL('../build/reports/',import.meta.url),{recursive:true});
    fs.writeFileSync(target,JSON.stringify({synthetic:true,assumptions:'Synthetic Apr–Sep 2026 history: monthly salary 60000, rent 18000, debt 5000, groceries 8000. Separate future stress scenarios reduce income or add essential costs; these periods are not used to train or backtest. User profile values are synthetic.',transactions:histories,profile:profile(),validation:model.validation,scenarios,uncertaintyDemo},null,2));
  }
});

test('Hindi and Marathi answers retain financial amounts and language survives reload',()=>{
  const {flow,context,localStorage}=app();const m=flow.load(rows(),profile());
  for(const lang of ['hi','mr']){
    context.FinLocale.set(lang);
    assert.equal(localStorage.getItem('finLanguage'),lang);
    assert.match(context.FinLocale.summary(m),/[\u0900-\u097f]/);
    assert.match(context.FinLocale.answer('मी ₹5000 खर्च करू शकतो का?',m),/₹/);
    assert.equal(flow.payload().locale,lang);
    assert.notEqual(context.FinLocale.translate('Safe to spend'),'Safe to spend');
  }
  context.FinLocale.set('en');assert.equal(context.FinLocale.translate('Safe to spend'),'Safe to spend');
});
