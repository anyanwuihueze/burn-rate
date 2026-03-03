"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Exchange the code in the URL for a session
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/auth/login"), 2000);
  };

  if (done) return (
    <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:"400px",padding:"0 24px",width:"100%",textAlign:"center"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"rgba(48,209,88,0.1)",border:"1px solid rgba(48,209,88,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
          <span style={{color:"#30D158",fontSize:"20px"}}>✓</span>
        </div>
        <h1 style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"40px",color:"#f0f0f0",marginBottom:"12px"}}>PASSWORD UPDATED.</h1>
        <p style={{color:"#555",fontSize:"13px"}}>Redirecting to login...</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"DM Mono,monospace"}}>
      <div style={{maxWidth:"400px",padding:"0 24px",width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"40px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#FF3B30"}}/>
          <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"24px",color:"#f0f0f0"}}>BURN RATE</span>
        </div>
        <h1 style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"48px",color:"#f0f0f0",lineHeight:"1",marginBottom:"8px"}}>NEW PASSWORD.</h1>
        <p style={{color:"#555",fontSize:"13px",marginBottom:"32px"}}>
          {ready ? "Choose your new password." : "Verifying reset link..."}
        </p>
        <form onSubmit={handleReset} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <input
            type="password"
            autoComplete="new-password"
            required minLength={8}
            placeholder="New password (min 8 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={!ready}
            style={{background:"#0f0f0f",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",padding:"14px 16px",fontSize:"12px",outline:"none",width:"100%",boxSizing:"border-box",opacity: ready ? 1 : 0.4}}
          />
          {error && <p style={{color:"#FF3B30",fontSize:"12px"}}>{error}</p>}
          <button type="submit" disabled={loading || !ready}
            style={{background:"#FF3B30",color:"white",border:"none",padding:"14px",fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",cursor: ready ? "pointer" : "not-allowed",opacity: ready ? 1 : 0.4}}>
            {loading ? "UPDATING..." : ready ? "UPDATE PASSWORD" : "VERIFYING..."}
          </button>
        </form>
      </div>
    </div>
  );
}
