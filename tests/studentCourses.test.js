const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('frontend/student_courses.html', 'utf8');
const source = html.slice(html.indexOf("        const STUDENT_COURSE_KEY"), html.lastIndexOf('        populateCampuses(); populateClasses();'));
function setup(fetch) {
    const store = new Map();
    const alerts = [], successes = [];
    const controls = {};
    for (const [name,value] of Object.entries({studentCourseId:'',studentCourseCampus:'Main Campus',studentCourseClass:'Class 3',studentCourseTitle:'Math',studentCourseDetails:'kk',studentCourseFile:''})) controls[name] = {value,disabled:false};
    controls.studentCourseFile.files = [{name:'course.txt'}];
    let submit, resets = 0;
    const button = {disabled:false,innerHTML:''};
    const form = {elements:[...Object.values(controls),button],addEventListener(_event, fn){submit=fn;},reset(){resets++;}};
    const context = {...controls,studentCourseForm:form,studentCourseList:{innerHTML:''},fetch,crypto:{randomUUID:()=> 'test-course'},
        window:{location:{origin:'http://test'}},localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},
        document:{querySelector:()=>button},lucide:{createIcons(){}},showAppAlert:(...args)=>alerts.push(args),showSuccessModal:(...args)=>successes.push(args),
        FileReader:class {readAsDataURL(){this.result='data:text/plain;base64,a2s=';queueMicrotask(()=>this.onload());}}};
    vm.createContext(context);vm.runInContext(source,context);
    return {context,store,alerts,successes,controls,submit:()=>submit({preventDefault(){},target:form}),resets:()=>resets};
}
const response = body => ({ok:true,json:async()=>body});
test('Class 3 save preserves selected fields/file and survives a reload',async()=>{
    let record;
    const env=setup(async(_url,options)=>{
        if(options?.method==='POST') {record=JSON.parse(options.body);return response({success:true,course:record,courses:[record]});}
        return response({success:true,courses:[record]});
    });
    await env.submit();
    assert.equal(record.classGrade,'Class 3');assert.equal(record.details,'kk');assert.equal(record.file.name,'course.txt');
    assert.equal(env.resets(),1);assert.equal(env.successes.length,1);
    await env.context.loadCourses();
    assert.equal(JSON.parse(env.store.get('eduCore_student_courses'))[0].classGrade,'Class 3');
});
test('old Play Group response cannot clear form or report successful Class 3 save',async()=>{
    const old={id:'old',classGrade:'Play Group',title:'math',details:'k',file:{name:'old.pdf'}};
    const env=setup(async()=>response({success:true,course:old,courses:[old]}));
    await env.submit();
    assert.equal(env.resets(),0);assert.equal(env.successes.length,0);assert.equal(env.alerts.length,1);
    assert.equal(env.controls.studentCourseClass.value,'Class 3');assert.equal(env.controls.studentCourseFile.disabled,false);
});
test('late initial GET cannot overwrite a newly saved course',async()=>{
    let resolveLoad,record,calls=0;
    const env=setup(async(_url,options)=>{
        if(options?.method==='POST') {record=JSON.parse(options.body);return response({success:true,course:record,courses:[record]});}
        if(++calls===1) return new Promise(resolve=>{resolveLoad=resolve;});
        return response({success:true,courses:[record]});
    });
    const loading=env.context.loadCourses();
    await env.submit();
    resolveLoad(response({success:true,courses:[{id:'old',classGrade:'Play Group'}]}));await loading;
    assert.equal(JSON.parse(env.store.get('eduCore_student_courses'))[0].classGrade,'Class 3');
});
test('read-back mismatch keeps entered course available for retry',async()=>{
    const env=setup(async(_url,options)=>{
        if(options?.method==='POST') {const record=JSON.parse(options.body);return response({success:true,course:record,courses:[record]});}
        return response({success:true,courses:[]});
    });
    await env.submit();assert.equal(env.resets(),0);assert.equal(env.alerts.length,1);assert.equal(env.successes.length,0);
});
