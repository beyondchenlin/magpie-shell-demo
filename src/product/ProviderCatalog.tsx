import { Fragment, useEffect, useState } from "react";
import { PrefRow } from "../components/PrefRow";
import { TextBtn } from "../components/TextBtn";
import type { ApplicationView, CatalogOutcome, ConfigView, Provider } from "./contract";
import { service, protocolVersion } from "./service";
import type { ProductLanguage } from "./preferences";

const labels:Record<CatalogOutcome,[string,string]>={pending:["检测中","Checking"],available:["目录端点请求成功（仅此端点）","Catalog request succeeded (this endpoint only)"],authentication:["鉴权失败（401/403），请检查凭据","Authentication rejected (401/403)"],rate_limited:["供应商限流，请等待退避","Provider rate limit; observe backoff"],unsupported:["不支持非生成目录检测，需要手动试调用","Catalog detection unsupported; manual inference required"],network:["DNS/网络失败，请检查地址与网络","DNS/network failure; check URL and network"],tls:["TLS 失败，请检查证书与地址","TLS failed; check certificate and URL"],timeout:["检测超时，请检查网络后重试","Detection timed out; check network"],upstream:["供应商服务错误，请稍后重试","Provider service error; retry later"],protocol:["目录协议错误或超出上限","Invalid or oversized catalog response"],cancelled:["检测已取消","Detection cancelled"]};
export function ProviderCatalog({view,busy,language,onMutate,onEdit,onChat}:{view:ApplicationView;busy:boolean;language:ProductLanguage;onMutate:(operation:()=>Promise<ConfigView>)=>Promise<boolean>;onEdit:(provider:Provider)=>void;onChat:()=>void}){
  const zh=language==="zh";const config=view.config;
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const applied=view.runtime.state==="running"&&view.runtime.effective_revision===config.desired_revision;
  const date=(value:number)=>new Date(value).toLocaleString(zh?"zh-CN":"en-US");
  return <section aria-label={zh?"检测与模型目录":"Detection and model catalogs"}>
    <div className="tagma-heading"><h2>{zh?"检测与模型目录":"Detection and model catalogs"}</h2></div>
    <p className="tagma-footnote">{zh?"只手动请求 GET /models，不生成内容。目录与推理事实分开；没有合适端点时，需要按预算手动试调用。":"Manual GET /models only; no generation. Catalog and inference facts are separate. Unsupported endpoints require manual inference within your budget."}</p>
    {!applied&&<p className="tagma-footnote">{zh?"先启动网关并应用已保存配置，才能检测该配置。":"Start the gateway and apply saved configuration before checking it."}</p>}
    <div className="list prefs">{config.providers.map(provider=>{
      const check=config.provider_catalog.find(record=>record.provider_id===provider.id);
      const ready=config.model_health.filter(record=>record.provider_id===provider.id&&record.inference==="ready").map(record=>record.model_id);
      return <Fragment key={provider.id}>
        <PrefRow name={provider.name} subClassName="wraps" sub={check?`${labels[check.outcome][zh?0:1]} · ${date(check.finished_ms??check.attempted_ms)}${check.http_status?` · HTTP ${check.http_status}`:""}`:(zh?"尚未检测；格式由保存时校验":"Not checked; URL format is validated on save")}>
          {check?.outcome==="pending"?<TextBtn disabled={busy||!applied} onClick={()=>void onMutate(async()=>{await service.cancelProbe(check.request_id);return (await service.view()).config;})}>{zh?"取消检测":"Cancel check"}</TextBtn>:<TextBtn disabled={busy||!applied||config.security.revoked_provider_ids.includes(provider.id)||!!check&&check.next_allowed_ms>now} onClick={()=>void onMutate(()=>service.probeProvider({protocol_version:protocolVersion,expected_revision:config.desired_revision,provider_id:provider.id,request_id:crypto.randomUUID()}))}>{zh?"检测目录":"Check catalog"}</TextBtn>}
        </PrefRow>
        {check&&<PrefRow name={zh?"检测记录":"Detection record"} subClassName="wraps" sub={`${check.source} · ${zh?"下次可检测":"Next check"}: ${date(check.next_allowed_ms)}`}/>}
        <PrefRow name={zh?"显式配置的模型":"Explicitly configured models"} subClassName="wraps" sub={provider.models.join(" · ")||"—"}/>
        {check?.catalog_ms!==null&&check?.catalog_ms!==undefined&&<PrefRow name={check.stale?(zh?"发现目录（缓存过期/需复检）":"Discovered catalog (stale; recheck required)"):(zh?"发现目录":"Discovered catalog")} subClassName="wraps" sub={<details><summary>{date(check.catalog_ms)} · {check.models.length} {zh?"个上游 ID":"upstream IDs"}</summary><p className="sub wraps">{check.models.join(" · ")||"—"}</p></details>}><TextBtn disabled={busy||!check.models.length} onClick={()=>onEdit({...provider,models:[...check.models]})}>{zh?"用目录编辑":"Edit from catalog"}</TextBtn></PrefRow>}
        <PrefRow name={zh?"真实推理记录":"Actual inference"} subClassName="wraps" sub={ready.length?`${zh?"五分钟内成功":"Success within five minutes"}: ${ready.join(" · ")}`:(zh?"没有近期推理成功；目录成功不计入。":"No recent inference success; catalog success does not count.")}><TextBtn disabled={busy} onClick={onChat}>{zh?"手动试调用":"Manual test call"}</TextBtn></PrefRow>
      </Fragment>;
    })}</div>
  </section>;
}
