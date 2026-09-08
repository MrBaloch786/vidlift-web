import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"VidLift — Private Video to MP4 & MP3 Converter",description:"Convert videos you own to MP4 or MP3 privately in your browser.",keywords:["video converter","video to mp3","mp4 converter","private video converter"],robots:{index:true,follow:true},openGraph:{title:"VidLift Video Converter",description:"Private, device-only MP4 and MP3 conversion.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
