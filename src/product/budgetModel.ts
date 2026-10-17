import type { BudgetObservations, BudgetRule, BudgetSpec } from "./contract";
import type { UsageBarrier } from "./usageClearModel";
import { assertUsageRead } from "./usageModel";

export type BudgetDraft = {name:string;scope:BudgetSpec["scope"]["kind"];provider:string;model:string;period:BudgetSpec["period"];requests:string;tokens:string};
export function budgetDraft(rule?:BudgetRule):BudgetDraft {
  const scope=rule?.spec.scope;
  return {name:rule?.spec.name??"",scope:scope?.kind??"all_attempts",provider:scope&&(scope.kind==="provider"||scope.kind==="model")?scope.provider_id:"",model:scope?.kind==="model"?scope.model_id:scope?.kind==="team"?scope.public_id:"",period:rule?.spec.period??"utc_month",requests:rule?.spec.request_limit??"",tokens:rule?.spec.token_limit??""};
}
export function budgetSpec(draft:BudgetDraft):BudgetSpec {
  const invalid=()=>{throw {code:"INVALID_INPUT"};};
  function limit(value:string){if(value==="")return null;if(!/^[1-9][0-9]{0,18}$/.test(value)||BigInt(value)>9223372036854775807n)return invalid();return value;}
  const request_limit=limit(draft.requests),token_limit=limit(draft.tokens);
  if((request_limit===null&&token_limit===null)||!draft.name.trim()||new TextEncoder().encode(draft.name).length>120||/[\p{Cc}]/u.test(draft.name))return invalid();
  let scope:BudgetSpec["scope"];
  switch(draft.scope){case "all_attempts":scope={kind:"all_attempts"};break;case "provider":scope={kind:"provider",provider_id:draft.provider};break;case "model":scope={kind:"model",provider_id:draft.provider,model_id:draft.model};break;case "team":scope={kind:"team",public_id:draft.model};break;default:return invalid();}
  if((scope.kind==="provider"||scope.kind==="model")&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(scope.provider_id))return invalid();
  if(scope.kind==="model"&&(!scope.model_id.trim()||new TextEncoder().encode(scope.model_id).length>256||/[\p{Cc}]/u.test(scope.model_id)||scope.model_id.startsWith("tagma/")))return invalid();
  if(scope.kind==="team"){
    const match=/^tagma\/([a-z0-9][a-z0-9-]{0,62}[a-z0-9])(?:@([1-9][0-9]*))?$/.exec(scope.public_id);
    if(!match||["reachflow","local-brain"].includes(match[1])||(match[2]&&(Number(match[2])<2||Number(match[2])>4294967295)))return invalid();
  }
  if(draft.period!=="utc_day"&&draft.period!=="utc_month")return invalid();
  // Convenience form checks; the shared core validates every saved rule again.
  return {name:draft.name,scope,period:draft.period,request_limit,token_limit};
}
export type BudgetReadState={busy:boolean;data:BudgetObservations|null;error:unknown};
type BudgetAPI={budgetObservations(revision:number):Promise<BudgetObservations>};
export class BudgetLoader {
  private epoch=0;
  private disposed=false;
  private state:BudgetReadState={busy:false,data:null,error:null};
  private api:BudgetAPI;
  private revision:number;
  private rules:BudgetRule[];
  private barrier:()=>UsageBarrier|null;
  private publish:(state:BudgetReadState)=>void;
  constructor(api:BudgetAPI,revision:number,rules:BudgetRule[],barrier:()=>UsageBarrier|null,publish:(state:BudgetReadState)=>void){this.api=api;this.revision=revision;this.rules=rules;this.barrier=barrier;this.publish=publish;}
  dispose(){this.disposed=true;this.epoch++;}
  private update(state:BudgetReadState){this.state=state;this.publish(state);}
  async load(){
    if(this.disposed||this.state.busy)return;
    const epoch=++this.epoch;this.update({busy:true,data:null,error:null});
    try{
      assertUsageRead(undefined,this.barrier());
      const report=await this.api.budgetObservations(this.revision);
      if(this.disposed||epoch!==this.epoch)return;
      assertUsageRead(report.info,this.barrier());
      if(report.config_revision!==this.revision||report.records.length!==this.rules.length||this.rules.some((rule,index)=>report.records[index].rule_id!==rule.id||report.records[index].kind!==(rule.spec.scope.kind==="team"?"request":"attempt")))throw {code:"CONFIG_CONFLICT"};
      this.update({busy:false,data:report,error:null});
    }catch(error){if(!this.disposed&&epoch===this.epoch)this.update({busy:false,data:null,error});}
  }
}
