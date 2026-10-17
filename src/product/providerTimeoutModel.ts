import type {ProviderTimeouts,SaveProviderTimeouts} from "./contract";
import {protocolVersion} from "./service";
export type TimeoutDraft=Record<keyof ProviderTimeouts,string>;
export function timeoutDraft(value:ProviderTimeouts):TimeoutDraft{return {connect_ms:String(value.connect_ms),first_response_ms:String(value.first_response_ms),idle_ms:String(value.idle_ms),total_ms:String(value.total_ms)};}
export function timeoutValues(draft:TimeoutDraft):ProviderTimeouts {
  const invalid=()=>{throw {code:"INVALID_INPUT"};};
  function value(key:keyof TimeoutDraft,max:number){const text=draft[key];if(!/^[1-9][0-9]{2,5}$/.test(text))return invalid();const number=Number(text);if(number<100||number>max)return invalid();return number;}
  const result={connect_ms:value("connect_ms",60000),first_response_ms:value("first_response_ms",120000),idle_ms:value("idle_ms",120000),total_ms:value("total_ms",120000)};
  if(result.connect_ms>result.first_response_ms||result.first_response_ms>result.total_ms||result.idle_ms>result.total_ms)return invalid();
  return result;
}
export type TimeoutSaveState={busy:boolean;error:unknown;saved:boolean};
// Each mounted editor owns one immutable provider/revision and one save at a
// time. No implicit apply, retry or post-disposal publication.
export class TimeoutSaver {
  private disposed=false;
  private busy=false;
  private completed=false;
  private id:string;
  private revision:number;
  private save:(input:SaveProviderTimeouts)=>Promise<boolean>;
  private publish:(state:TimeoutSaveState)=>void;
  constructor(id:string,revision:number,save:(input:SaveProviderTimeouts)=>Promise<boolean>,publish:(state:TimeoutSaveState)=>void){this.id=id;this.revision=revision;this.save=save;this.publish=publish;}
  dispose(){this.disposed=true;}
  async submit(draft:TimeoutDraft){
    if(this.disposed||this.busy||this.completed)return;
    let timeouts:ProviderTimeouts;try{timeouts=timeoutValues(draft);}catch(error){this.publish({busy:false,error,saved:false});return;}
    this.busy=true;this.publish({busy:true,error:null,saved:false});
    try{const saved=await this.save({protocol_version:protocolVersion,expected_revision:this.revision,id:this.id,timeouts});if(saved)this.completed=true;if(!this.disposed)this.publish({busy:false,error:null,saved});}
    catch(error){if(!this.disposed)this.publish({busy:false,error,saved:false});}
    finally{this.busy=false;}
  }
}
