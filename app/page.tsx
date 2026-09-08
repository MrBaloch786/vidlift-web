"use client";
import {useMemo,useRef,useState} from "react";
import {Check,Clipboard,Download,FileAudio,Film,Heart,Link2,LockKeyhole,UploadCloud,X} from "lucide-react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from "@/components/ui/dialog";
type Format="mp4"|"mp3";
type SourceMode="link"|"file";
const qualities=["Original","2160p (4K)","1440p (2K)","1080p","720p","480p"];
const bitrates=["320 kbps","256 kbps","192 kbps","128 kbps"];
const SPONSOR_URL = process.env.NEXT_PUBLIC_ADSTERRA_URL?.trim() || "";

function directLinkError(value: string) {
  if (!value.trim()) return "Paste a direct video-file URL.";

  try {
    const url = new URL(value);

    // 1. Check protocol (HTTP/HTTPS only)
    if (!["http:", "https:"].includes(url.protocol)) {
      return "Use an HTTP or HTTPS link.";
    }

    const host = url.hostname.toLowerCase();
    const isYouTube =
      host.includes("youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".youtu.be");

    // 2. Allow YouTube links directly; otherwise, require a video file extension
    if (!isYouTube && !/\.(mp4|mov|webm|m4v)$/i.test(url.pathname)) {
      return "The link must end in .mp4, .mov, .webm, or .m4v.";
    }

    return "";
  } catch {
    return "Enter a complete, valid URL.";
  }
}function Logo(){return <span className="logo-mark" aria-hidden="true"><span>V</span></span>}
function ChaiDialog(){const [copied,setCopied]=useState("");function copy(value:string){navigator.clipboard.writeText(value);setCopied(value);setTimeout(()=>setCopied(""),1600)}return <Dialog><DialogTrigger asChild><button className="chai"><Heart size={17}/> Buy me chai</button></DialogTrigger><DialogContent className="chai-dialog"><DialogHeader><DialogTitle>Buy me a chai</DialogTitle><DialogDescription>If VidLift helped you, you can support its running costs.</DialogDescription></DialogHeader><div className="pay-method"><span>JazzCash Till ID</span><strong>984279231</strong><button type="button" onClick={()=>copy("984279231")} aria-label="Copy JazzCash Till ID">{copied==="984279231"?<Check/>:<Clipboard/>}</button></div><div className="pay-method"><span>Binance ID</span><strong>1179481269</strong><button type="button" onClick={()=>copy("1179481269")} aria-label="Copy Binance ID">{copied==="1179481269"?<Check/>:<Clipboard/>}</button></div><form className="proof-form" action="https://formsubmit.co/mureedhussain0110@gmail.com" method="POST" encType="multipart/form-data"><input type="hidden" name="_subject" value="New VidLift chai payment"/><input type="hidden" name="_template" value="table"/><label>Payment method<select name="payment_method" required><option value="">Select method</option><option>JazzCash</option><option>Binance</option></select></label><label>Your number or Binance ID<input name="payer_number" required placeholder="Used for payment"/></label><label>Transaction ID<input name="transaction_id" required placeholder="Enter transaction ID"/></label><label>Payment screenshot <small>PNG or JPG, maximum 10 MB</small><input type="file" name="attachment" accept="image/png,image/jpeg" required/></label><label className="data-consent"><input type="checkbox" required/><span>I agree to send these details through FormSubmit for verification.</span></label><button type="submit" className="submit-proof">Send payment proof</button></form><p className="form-note">Your first submission will ask the site owner to activate email delivery.</p></DialogContent></Dialog>}
export default function Home(){
 const inputRef=useRef<HTMLInputElement>(null);const [sourceMode,setSourceMode]=useState<SourceMode>("link");const [videoUrl,setVideoUrl]=useState("");const [linkTouched,setLinkTouched]=useState(false);const [file,setFile]=useState<File|null>(null);const [format,setFormat]=useState<Format>("mp4");const [quality,setQuality]=useState("Original");const [agreed,setAgreed]=useState(false);const [sponsor,setSponsor]=useState(false);const preview=useMemo(()=>file?URL.createObjectURL(file):"",[file]);const linkError=directLinkError(videoUrl);const sourceReady=sourceMode==="file"?!!file:!linkError;
 function chooseFile(next?:File){if(!next)return;if(!next.type.startsWith("video/"))return alert("Please choose a video file.");setFile(next);setSponsor(false)}
 function saveOriginal(){if(sourceMode==="link"){if(linkError)return;window.open(videoUrl,"_blank","noopener,noreferrer");setSponsor(false);return}if(!file)return;const a=document.createElement("a");a.href=preview;a.download=file.name;a.click();setSponsor(false)}
 function visitSponsor(){if(!SPONSOR_URL)return alert("Sponsor link is not configured yet.");window.open(SPONSOR_URL,"_blank","noopener,noreferrer");setSponsor(true)}
 return <main>
  <header className="nav shell"><a className="brand" href="#top" aria-label="VidLift home"><Logo/><b>VidLift</b></a><nav><a href="#converter">Converter</a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav><div className="nav-actions"><span className="safe"><LockKeyhole size={14}/> Private by design</span><ChaiDialog/></div></header>
  <section className="hero shell" id="top"><div className="eyebrow"><span/> VIDEO & AUDIO TOOLKIT</div><h1>Your video.<br/><em>Your format.</em></h1><p>Convert video files you own into clean MP4 or high-quality MP3. Processing stays on your device.</p></section>
  <section className="converter shell" id="converter">
   <div className="source-switch"><button className={sourceMode==="link"?"selected":""} onClick={()=>{setSourceMode("link");setSponsor(false)}}><Link2/> Paste direct link</button><button className={sourceMode==="file"?"selected":""} onClick={()=>{setSourceMode("file");setSponsor(false)}}><UploadCloud/> Choose file</button></div>
   {sourceMode==="file"&&<div className="tabs"><button className={format==="mp4"?"active":""} onClick={()=>setFormat("mp4")}><Film size={18}/> Video</button><button className={format==="mp3"?"active":""} onClick={()=>setFormat("mp3")}><FileAudio size={18}/> MP3 audio</button></div>}
   {sourceMode==="link"?<div className="link-box"><label htmlFor="video-link">Direct video-file link</label><div><Link2/><input id="video-link" type="url" value={videoUrl} onBlur={()=>setLinkTouched(true)} onChange={e=>{setVideoUrl(e.target.value);setSponsor(false)}} placeholder="https://example.com/video.mp4"/><button type="button" onClick={()=>{setVideoUrl("");setSponsor(false)}} aria-label="Clear link"><X/></button></div>{linkTouched&&linkError?<p className="link-error">{linkError}</p>:<p>Supports authorized MP4, MOV, WebM, and M4V file URLs.</p>}</div>:(!file?<button className="dropzone" onClick={()=>inputRef.current?.click()} onDrop={e=>{e.preventDefault();chooseFile(e.dataTransfer.files[0])}} onDragOver={e=>e.preventDefault()}><span className="upload-icon"><UploadCloud/></span><strong>Drop your video here</strong><small>or click to browse · MP4, MOV, WebM · up to 2 GB</small><span className="browse">Choose video</span></button>:<div className="file-card"><video src={preview} muted playsInline/><div><strong>{file.name}</strong><small>{(file.size/1048576).toFixed(1)} MB · Ready to convert</small></div><button className="remove" aria-label="Remove video" onClick={()=>{setFile(null);setSponsor(false)}}><X/></button></div>)}
   <input ref={inputRef} type="file" accept="video/*" hidden onChange={e=>chooseFile(e.target.files?.[0])}/>
   {sourceMode==="file"?<div className="settings"><label><span>Output format</span><select value={format} onChange={e=>setFormat(e.target.value as Format)}><option value="mp4">MP4 video</option><option value="mp3">MP3 audio</option></select></label><label><span>{format==="mp4"?"Video quality":"Audio quality"}</span><select value={quality} onChange={e=>setQuality(e.target.value)}>{(format==="mp4"?qualities:bitrates).map(q=><option key={q}>{q}</option>)}</select></label></div>:<p className="direct-note">Direct links open in their original format and quality. Your browser or the source server controls whether the file opens or downloads.</p>}
   <label className="consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I own this file or have permission to download it.</span></label><button className="primary" disabled={!sourceReady||!agreed} onClick={visitSponsor}><Download/> Visit sponsor & continue</button><p className="microcopy">The sponsor opens in a new tab. Return here to download the original file.</p>
   {sponsor&&<div className="sponsor-panel" role="status"><div><span>SPONSOR VISITED</span><strong>Your file is ready</strong><p>Thank you for supporting VidLift.</p></div><button onClick={saveOriginal}>{sourceMode==="link"?"Open video file":"Download original file"}</button></div>}
  </section>
  <section className="trust shell"><span>NO UPLOADS</span><span>NO ACCOUNTS</span><span>DEVICE-ONLY PROCESSING</span></section>
  <section className="steps shell" id="how"><div><small>01</small><h2>Add source</h2><p>Paste an authorized direct file link or choose a local video.</p></div><div><small>02</small><h2>Set format</h2><p>Choose the available video or audio option.</p></div><div><small>03</small><h2>Download</h2><p>Open or save the original media file.</p></div></section>
  <section className="faq shell" id="faq"><h2>Good to know</h2><details><summary>Can I paste a YouTube URL?</summary><p>No. VidLift is for files you own or have permission to use. It does not bypass restrictions on third-party platforms.</p></details><details><summary>Can every video become 4K?</summary><p>No. Selecting 4K cannot create real detail missing from a lower-resolution source. Original quality is usually best.</p></details><details><summary>Where are my files stored?</summary><p>They are not uploaded by this interface. Your browser handles the file locally.</p></details></section>
  <footer className="shell"><a className="brand" href="#top"><Logo/><b>VidLift</b></a><p>Convert responsibly. Only process content you own or may use.</p><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/copyright">Copyright</a></div></footer>
 </main>
}
