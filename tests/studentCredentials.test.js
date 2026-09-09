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
