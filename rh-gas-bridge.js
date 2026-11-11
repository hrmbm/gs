/*
 * Native GAS transport facade. No direct database SDK, credentials, or external API.
 * Preserves `getClient().rpc(name, params) -> {data,error}` used by existing UI code.
 * All writes are serialized in this browser tab; the server transaction layer provides
 * cross-tab/user locking and idempotency. No automatic retry after an unknown outcome.
 */
(function(w){'use strict';
 var c=w.RH_GAS_CONFIG||{},url=String(c.endpoint||''),timeout=Number(c.requestTimeoutMs)||30000;
 var frame=null,bridgeOrigin='',ready=false,readyPromise=null,resolveReady=null,rejectReady=null,pending=Object.create(null),tail=Promise.resolve();
 var reads=new Set(["admin_get_attendance_history", "bootstrap", "get_delegate_options", "get_face_photos", "get_face_registration_progress", "get_karyawan_options", "get_karyawan_summary", "get_lokasi_kantor", "get_master_cuti", "get_my_attendance_approval_detail", "get_my_face_data", "get_my_notifications", "get_my_pending_requests", "get_my_profile", "get_my_timeoff_request_detail", "get_org_chart", "get_pending_approvals", "get_riwayat_cuti", "get_riwayat_kehadiran", "get_sisa_cuti", "get_status_hari_ini", "get_team_activity", "hr_attendance_today", "hr_attendance_week", "hr_get_activity_log", "hr_get_attendance_monitoring", "hr_get_attendance_schedule", "hr_get_attendance_summary", "hr_get_employee_attendance_history", "hr_get_employee_directory", "hr_get_incentive_employee_recap", "hr_get_incentive_exclusions", "hr_get_incentive_formula", "hr_get_incentive_signatories", "hr_get_leave_list_v2", "hr_get_my_attendance_dayoff_context", "hr_get_my_timeoff_clockin_guard", "hr_get_pending_approval_tracking", "hr_get_personal_file", "hr_get_personal_file_batch", "hr_get_working_calendar", "hr_leave_yearly_stats", "hr_monthly_report", "ping_server"]);
 function uuid(){try{var b=new Uint8Array(16);crypto.getRandomValues(b);return Array.prototype.map.call(b,function(x){return x.toString(16).padStart(2,'0');}).join('');}catch(e){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}}
 function isGasOrigin(s){try{var u=new URL(s);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com');}catch(e){return false;}}
 function onMessage(ev){if(!frame||ev.source!==frame.contentWindow||!isGasOrigin(ev.origin))return;var m=ev.data||{};
   if(m.type==='RH_GAS_NATIVE_READY'){bridgeOrigin=ev.origin;ready=true;if(resolveReady)resolveReady();return;}
   if(ev.origin!==bridgeOrigin||m.type!=='RH_GAS_NATIVE_RESPONSE'||!m.requestId||!pending[m.requestId])return;
   var p=pending[m.requestId];delete pending[m.requestId];clearTimeout(p.timer);p.resolve(m.response||{ok:false,error:{code:'RH_EMPTY_RESPONSE',message:'Respons kosong.'}});
 }
 w.addEventListener('message',onMessage,false);
 function connect(){if(ready)return Promise.resolve();if(readyPromise)return readyPromise;
   if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))return Promise.reject(new Error('URL deployment GAS belum valid.'));
   readyPromise=new Promise(function(resolve,reject){resolveReady=resolve;rejectReady=reject;frame=document.createElement('iframe');frame.title='ReHolz native backend bridge';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;bottom:0;opacity:0;pointer-events:none;border:0;';frame.src=url+'?transport=iframe&v='+encodeURIComponent(c.version||'1');(document.body||document.documentElement).appendChild(frame);
     var activeFrame=frame;
     var t=setTimeout(function(){if(!ready){readyPromise=null;frame=null;try{if(activeFrame&&activeFrame.parentNode)activeFrame.parentNode.removeChild(activeFrame);}catch(_){}reject(new Error('Bridge GAS tidak merespons.'))}},15000);
     var old=resolveReady;resolveReady=function(){clearTimeout(t);old();};
   });return readyPromise;
 }
 function send(req,ms){return connect().then(function(){return new Promise(function(resolve,reject){var id=uuid(),payload=Object.assign({},req||{}),t=setTimeout(function(){delete pending[id];var e=new Error('Timeout. Status transaksi belum dapat dipastikan; jangan kirim ulang sebelum cek status.');e.uncertain=true;e.requestId=id;reject(e);},ms||timeout);payload.transportId=id;if(payload.action==='rpc'&&!reads.has(payload.fn))payload.idempotencyKey=id;if(payload.action==='legacy')payload.idempotencyKey=id;pending[id]={resolve:resolve,reject:reject,timer:t};frame.contentWindow.postMessage({type:'RH_GAS_NATIVE_REQUEST',requestId:id,request:payload},bridgeOrigin);});});}
 function rpc(fn,params,ms){var req={action:'rpc',fn:String(fn||''),params:params||{}};
   function run(){return send(req,ms).then(function(r){return r&&r.ok?{data:r.data,error:null}:{data:null,error:r&&r.error||{code:'RH_API_ERROR',message:'Backend menolak request.'}};}).catch(function(e){return {data:null,error:{code:e.uncertain?'RH_OUTCOME_UNKNOWN':'RH_TRANSPORT_ERROR',message:e.message,uncertain:!!e.uncertain,requestId:e.requestId||null}};});}
   if(reads.has(fn))return run();var job=tail.then(run,run);tail=job.then(function(){},function(){});return job;
 }
 function legacy(fn,args,ms){return send({action:'legacy',fn:String(fn||''),args:Array.isArray(args)?args:[]},ms);}
 var client={rpc:rpc};
 w.RHGasBridge={getClient:function(){return client;},callLegacy:legacy,health:function(){return send({action:'health'});},requestStatus:function(id){return send({action:'request_status',requestId:String(id||'')});}};
})(window);
