"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true); setLoading(false);
  };
  if (done) return (
    <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:"400px",padding:"0 24px",width:"100%"}}>
        <h1 style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"48px",color:"#f0f0f0",marginBottom:"12px"}}>CHECK YOUR EMAIL.</h1>
        <p style={{color:"#555",fontSize:"13px",marginBottom:"32px"}}>Reset link sent to {email}</p>
        <a href="/auth/login" style={{color:"#FF3B30",fontSize:"12px",textDecoration:"none"}}>BACK TO LOGIN</a>
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
        <h1 style={{fontFamily:"Bebas Neue,sans-serif",fontSize:"48px",color:"#f0f0f0",lineHeight:"1",marginBottom:"8px"}}>RESET PASSWORD.</h1>
        <p style={{color:"#555",fontSize:"13px",marginBottom:"32px"}}>Enter your email. We will send a reset link.</p>
        <form onSubmit={handleReset} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <input type="email" required placeholder="dev@yourcompany.com" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{background:"#0f0f0f",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",padding:"14px 16px",fontSize:"12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          {error && <p style={{color:"#FF3B30",fontSize:"12px"}}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{background:"#FF3B30",color:"white",border:"none",padding:"14px",fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer"}}>
            {loading ? "SENDING..." : "SEND RESET LINK"}
          </button>
        </form>
        <p style={{textAlign:"center",marginTop:"24px"}}>
          <a href="/auth/login" style={{color:"#FF3B30",fontSize:"12px",textDecoration:"none"}}>Back to login</a>
        </p>
      </div>
    </div>
  );
}
