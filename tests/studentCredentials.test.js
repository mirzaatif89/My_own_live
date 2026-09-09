const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const vm = require('node:vm');
const fs = require('node:fs');
const { studentPasswordFields } = require('../api/_lib/studentCredentials');
test('student password changes and blank edits preserve a working hash', async () => {
 const old = await bcrypt.hash('OldPassword', 4);
 const updated = await studentPasswordFields({password:'NewPassword',plainPassword:'OldPassword'}, {password:old});
 assert.equal(await bcrypt.compare('NewPassword',updated.password),true);
 assert.equal(await bcrypt.compare('OldPassword',updated.password),false);
 const plainOnly = await studentPasswordFields({plainPassword:'ResetPassword'}, updated);
 assert.equal(await bcrypt.compare('ResetPassword',plainOnly.password),true);
 assert.deepEqual(await studentPasswordFields({},updated),updated);
 assert.deepEqual(await studentPasswordFields({password:old,plainPassword:'OldPassword'},updated),updated);
});

test('cPanel student save persists a reset and a stale sync cannot revert it', async () => {
 const source = fs.readFileSync(require.resolve('../backend/server'), 'utf8');
 const start = source.indexOf("app.post('/api/students',");
 const end = source.indexOf("app.delete('/api/students/:id'", start);
 let handler;
 let profile = {id:'s1',username:'student-test',password:await bcrypt.hash('OldPassword',4),plainPassword:'OldPassword'};
 const stale = {...profile};
 let auth;
 const Student = {findAll:async()=>[profile],findByPk:async()=>profile,upsert:async item=>{profile={...profile,...item};}};
 const context = {app:{post:(_path,_auth,fn)=>{handler=fn;}},authenticateToken(){},sequelize:{models:{Student,User:{}}},
   studentPasswordFields,normalizeOptionalEmail:v=>v||null,ensureUniqueStudentIdentity:async()=>{},
   enforceActionPermission:async()=>true,upsertAuthUser:async(_model,item)=>{auth=item;},io:{emit(){}}};
 vm.runInNewContext(source.slice(start,end),context);
 for (const item of [{id:'s1',password:'NewPassword'},stale]) {
   const res={status(code){this.code=code;return this;},json(body){this.body=body;}};
   await handler({body:item},res);
   assert.equal(res.body.success,true);
   assert.equal(profile.username,'student-test');
   assert.equal(profile.plainPassword,'NewPassword');
   assert.equal(await bcrypt.compare('NewPassword',profile.password),true);
   assert.equal(await bcrypt.compare('OldPassword',auth.password),false);
 }
});

test('password eye toggles once per click for inline and delegated buttons', () => {
 const source=fs.readFileSync(require.resolve('../frontend/script.js'),'utf8');
 const start=source.indexOf('function togglePasswordVisibility(');
 const end=source.indexOf("document.addEventListener('DOMContentLoaded'",start);
 for (const inline of [true,false]) {
   let click;
   const input={type:'password',getAttribute(){return this.type;},setAttribute(_key,value){this.type=value;},focus(){}};
   const button={getAttribute:()=> 'studentPassword',hasAttribute:()=>inline};
   const document={body:{dataset:{}},getElementById:()=>input,querySelectorAll:()=>[button],addEventListener:(_name,fn)=>{click=fn;}};
   const context={document,window:{},refreshPasswordToggleIcon(){}};
   vm.runInNewContext(source.slice(start,end),context);
   context.bindPasswordToggles();
   for (const expected of ['text','password']) {
     if(inline) context.togglePasswordVisibility('studentPassword',button);
     click({target:{closest:()=>button},preventDefault(){}});
     assert.equal(input.type,expected);
   }
 }
});
test('student login uses profile password over stale auth row and recovers missing auth row',async()=>{
 const hash=await bcrypt.hash('NewPassword',4),old=await bcrypt.hash('OldPassword',4);
 for(const missing of [false,true]) {
 let repaired=false;const profile={id:'s1',username:'student-test',password:hash,fullName:'Test'};
 const db={models:{Student:{findByPk:async()=>profile,findOne:async()=>profile},User:{findOne:async()=>missing?null:{id:'student_s1',profileId:'s1',role:'Student',username:'student-test',password:old}}}};
 const context={module:{exports:{}},process:{env:{}},require:name=>name==='./_lib/http'?{createHandler:x=>x.POST,sendJson:(res,status,body)=>{res.status=status;res.body=body}}:name==='./_lib/db'?{getDb(){},Op:{or:Symbol('or')}}:{JWT_SECRET:'test',bcrypt,jwt:{sign:()=> 'token'},loadPermissions:async()=>({loginAccess:{},roleGroups:{}}),isPasswordHash:v=>String(v).startsWith('$2'),upsertAuthUser:async()=>{repaired=true}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../api/login'),'utf8'),context);
 for(const [password,status] of [['OldPassword',401],['NewPassword',200]]) {const res={};await context.module.exports({res,db,body:{username:'student-test',password}});assert.equal(res.status,status);}
 assert.equal(repaired,true);
 }
});
