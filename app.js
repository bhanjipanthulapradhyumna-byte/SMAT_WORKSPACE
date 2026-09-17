const codeEditor=document.getElementById("code"),output=document.getElementById("output"),filename=document.getElementById("filename"),lineNumbers=document.getElementById("lineNumbers"),status=document.getElementById("status"),executionState=document.getElementById("executionState");

function updateLineNumbers(){const lines=codeEditor.value.split("\n").length;lineNumbers.textContent=Array.from({length:lines},(_,i)=>i+1).join("\n")}
codeEditor.addEventListener("input",updateLineNumbers);codeEditor.addEventListener("scroll",()=>{lineNumbers.scrollTop=codeEditor.scrollTop});updateLineNumbers();

async function runCode(){
  output.textContent="Running...";executionState.textContent="Running";status.textContent="Executing";
  try{
    const response=await fetch("/api/execute",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:codeEditor.value})});
    const result=await response.json();
    if(!result.success){output.textContent="Execution Error:\n\n"+result.error;executionState.textContent="Error";status.textContent="Failed";return}
    output.textContent=result.output||"(no output)";executionState.textContent="Completed";status.textContent="Ready";
  }catch(error){output.textContent="Connection error:\n\n"+error.message;executionState.textContent="Offline";status.textContent="Error"}
}

document.getElementById("newBtn").addEventListener("click",()=>{if(!confirm("Create a new file?"))return;filename.value="untitled.m";codeEditor.value="% New SMAT script\n\n";output.textContent="";executionState.textContent="Idle";status.textContent="Ready";updateLineNumbers()});

async function saveFile(saveAs=false){
  let name=filename.value.trim();
  if(saveAs){const requested=prompt("Enter filename:",name);if(!requested)return;name=requested;if(!name.endsWith(".m"))name+=".m";filename.value=name}
  try{
    const response=await fetch("/api/files/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:name,content:codeEditor.value})});
    const result=await response.json();if(!result.success){alert(result.error);return}
    status.textContent="Saved";
  }catch(error){alert("Save failed: "+error.message)}
}
document.getElementById("saveBtn").addEventListener("click",()=>saveFile(false));
document.getElementById("saveAsBtn").addEventListener("click",()=>saveFile(true));
document.getElementById("clearBtn").addEventListener("click",()=>{output.textContent="";executionState.textContent="Idle"});
document.getElementById("runBtn").addEventListener("click",runCode);

codeEditor.addEventListener("keydown",event=>{
  if(event.ctrlKey&&event.key==="Enter"){event.preventDefault();runCode()}
  if(event.key==="Tab"){event.preventDefault();const start=codeEditor.selectionStart,end=codeEditor.selectionEnd;codeEditor.value=codeEditor.value.substring(0,start)+"    "+codeEditor.value.substring(end);codeEditor.selectionStart=codeEditor.selectionEnd=start+4;updateLineNumbers()}
});
