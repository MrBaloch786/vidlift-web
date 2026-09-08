"use client";
import {useMemo,useRef,useState} from "react";
import {Download,FileAudio,Film,LockKeyhole,UploadCloud,X} from "lucide-react";
type Format="mp4"|"mp3";
const qualities=["Original","2160p (4K)","1440p (2K)","1080p","720p","480p"];
const bitrates=["320 kbps","256 kbps","192 kbps","128 kbps"];
function Logo(){return <span className="logo-mark" aria-hidden="true"><span>V</span></span>}
export default function Home(){
 const inputRef=useRef<HTMLInputElement>(null);const [file,setFile]=useState<File|null>(null);const [format,setFormat]=useState<Format>("mp4");const [quality,setQuality]=useState("Original");const [agreed,setAgreed]=useState(false);const [sponsor,setSponsor]=useState(false);const preview=useMemo(()=>file?URL.createObjectURL(file):"",[file]);
 function chooseFile(next?:File){if(!next)return;if(!next.type.startsWith("video/"))return alert("Please choose a video file.");setFile(next);setSponsor(false)}
 function saveOriginal(){if(!file)return;const a=document.createElement("a");a.href=preview;a.download=file.name;a.click();setSponsor(false)}
 return <main>
  <header className="nav shell"><a className="brand" href="#top" aria-label="VidLift home"><Logo/><b>VidLift</b></a><nav><a href="#converter">Converter</a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav><span className="safe"><LockKeyhole size={14}/> Private by design</span></header>
  <section className="hero shell" id="top"><div className="eyebrow"><span/> VIDEO & AUDIO TOOLKIT</div><h1>Your video.<br/><em>Your format.</em></h1><p>Convert video files you own into clean MP4 or high-quality MP3. Processing stays on your device.</p></section>
  <section className="converter shell" id="converter">
   <div className="tabs" role="tablist"><button className={format==="mp4"?"active":""} onClick={()=>setFormat("mp4")}><Film size={18}/> Video</button><button className={format==="mp3"?"active":""} onClick={()=>setFormat("mp3")}><FileAudio size={18}/> MP3 audio</button></div>
   {!file?<button className="dropzone" onClick={()=>inputRef.current?.click()} onDrop={e=>{e.preventDefault();chooseFile(e.dataTransfer.files[0])}} onDragOver={e=>e.preventDefault()}><span className="upload-icon"><UploadCloud/></span><strong>Drop your video here</strong><small>or click to browse · MP4, MOV, WebM · up to 2 GB</small><span className="browse">Choose video</span></button>:<div className="file-card"><video src={preview} muted playsInline/><div><strong>{file.name}</strong><small>{(file.size/1048576).toFixed(1)} MB · Ready to convert</small></div><button className="remove" aria-label="Remove video" onClick={()=>{setFile(null);setSponsor(false)}}><X/></button></div>}
   <input ref={inputRef} type="file" accept="video/*" hidden onChange={e=>chooseFile(e.target.files?.[0])}/>
   <div className="settings"><label><span>Output format</span><select value={format} onChange={e=>setFormat(e.target.value as Format)}><option value="mp4">MP4 video</option><option value="mp3">MP3 audio</option></select></label><label><span>{format==="mp4"?"Video quality":"Audio quality"}</span><select value={quality} onChange={e=>setQuality(e.target.value)}>{(format==="mp4"?qualities:bitrates).map(q=><option key={q}>{q}</option>)}</select></label></div>
   <label className="consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I own this file or have permission to convert it.</span></label><button className="primary" disabled={!file||!agreed} onClick={()=>setSponsor(true)}><Download/> Continue through sponsor</button><p className="microcopy">A clearly labelled sponsor page may open before your download. No fake download buttons.</p>
   {sponsor&&<div className="sponsor-panel" role="status"><div><span>SPONSOR STEP</span><strong>Your file is ready</strong><p>Add your Adsterra Direct Link to the marked configuration value before launch.</p></div><button onClick={saveOriginal}>Download original file</button></div>}
  </section>
  <section className="trust shell"><span>NO UPLOADS</span><span>NO ACCOUNTS</span><span>DEVICE-ONLY PROCESSING</span></section>
  <section className="steps shell" id="how"><div><small>01</small><h2>Choose</h2><p>Select a video stored on your device.</p></div><div><small>02</small><h2>Set format</h2><p>Choose MP4 resolution or MP3 bitrate.</p></div><div><small>03</small><h2>Download</h2><p>Save the processed file back to your device.</p></div></section>
  <section className="faq shell" id="faq"><h2>Good to know</h2><details><summary>Can I paste a YouTube URL?</summary><p>No. VidLift is for files you own or have permission to use. It does not bypass restrictions on third-party platforms.</p></details><details><summary>Can every video become 4K?</summary><p>No. Selecting 4K cannot create real detail missing from a lower-resolution source. Original quality is usually best.</p></details><details><summary>Where are my files stored?</summary><p>They are not uploaded by this interface. Your browser handles the file locally.</p></details></section>
  <footer className="shell"><a className="brand" href="#top"><Logo/><b>VidLift</b></a><p>Convert responsibly. Only process content you own or may use.</p><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/copyright">Copyright</a></div></footer>
 </main>
}
